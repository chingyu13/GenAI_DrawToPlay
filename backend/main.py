# main.py — FastAPI entry point
import os
import time
import threading
from collections import defaultdict, deque
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional
from agent import chat, get_song_result, get_playlist_result, extract_session_features, get_conversation, score_song_candidates
from tools import get_song, get_songs, get_playlists
from database import save_session, update_spotify_opened, append_song_rating, session_belongs_to_frontend
import requests as http_requests

app = FastAPI()

# Minimum mood-fit score for a keyword-search candidate to be accepted outright.
SONG_MATCH_THRESHOLD = 0.6
DEFAULT_ALLOWED_ORIGINS = "http://localhost:8080,http://localhost:5173,http://127.0.0.1:8080,http://127.0.0.1:5173"
_local_origins = [o.strip() for o in DEFAULT_ALLOWED_ORIGINS.split(",") if o.strip()]
_env_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
ALLOWED_ORIGINS = list(dict.fromkeys(_env_origins + _local_origins))
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "60"))
RATE_LIMIT_WINDOW_SEC = int(os.getenv("RATE_LIMIT_WINDOW_SEC", "60"))
TRUST_PROXY = os.getenv("TRUST_PROXY", "").lower() in ("1", "true", "yes")
_request_times: dict[str, deque[float]] = defaultdict(deque)
_last_sweep = 0.0
SESSION_LINK_TTL_SEC = int(os.getenv("SESSION_LINK_TTL_SEC", "7200"))
# session-complete / rate / spotify-opened run in the threadpool (sync def), so this
# fallback map is touched by multiple threads. _link_lock guards its bookkeeping only.
_session_db_ids: dict[str, tuple[str, float]] = {}
_link_lock = threading.Lock()


def client_ip(request: Request) -> str:
    """Use X-Forwarded-For only when explicitly behind a trusted reverse proxy."""
    if TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def remember_db_session(frontend_session_id: str, db_session_id: str) -> None:
    now = time.time()
    with _link_lock:
        expired = [
            sid for sid, (_, created_at) in _session_db_ids.items()
            if now - created_at > SESSION_LINK_TTL_SEC
        ]
        for sid in expired:
            _session_db_ids.pop(sid, None)
        _session_db_ids[frontend_session_id] = (db_session_id, now)


def session_matches_db(frontend_session_id: str, db_session_id: str) -> bool:
    # DB check first (survives restarts / works across instances) — I/O, kept out of the lock.
    if session_belongs_to_frontend(db_session_id, frontend_session_id):
        return True
    with _link_lock:
        remembered = _session_db_ids.get(frontend_session_id)
        if not remembered:
            return False
        remembered_db_id, created_at = remembered
        if time.time() - created_at > SESSION_LINK_TTL_SEC:
            _session_db_ids.pop(frontend_session_id, None)
            return False
        return remembered_db_id == db_session_id

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    ip = client_ip(request)
    now = time.time()

    # Opportunistic sweep (at most once per window) drops IPs with no activity in
    # the window, so one-shot visitors don't accumulate forever. This middleware runs
    # on the event loop (single-threaded) with no await inside the block, so it needs
    # no lock. Building `stale` fully before deleting avoids mutating during iteration.
    global _last_sweep
    if now - _last_sweep > RATE_LIMIT_WINDOW_SEC:
        _last_sweep = now
        stale = [k for k, b in _request_times.items()
                 if not b or now - b[-1] > RATE_LIMIT_WINDOW_SEC]
        for k in stale:
            del _request_times[k]

    bucket = _request_times[ip]
    while bucket and now - bucket[0] > RATE_LIMIT_WINDOW_SEC:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX:
        return JSONResponse({"detail": "rate limit exceeded"}, status_code=429)
    bucket.append(now)
    return await call_next(request)

@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok"}

class MessageRequest(BaseModel):
    message:    str = Field(..., max_length=2000)
    session_id: str = Field(..., min_length=8, max_length=80)
    image:      Optional[str]  = Field(default=None, max_length=5_500_000)
    telemetry:  Optional[dict] = None


class SessionCompleteRequest(BaseModel):
    session_id:                str = Field(..., min_length=8, max_length=80)
    drawing_duration_sec:      Optional[int]  = None
    conversation_duration_sec: Optional[int]  = None
    device_type:               Optional[str]  = None
    user_timezone:             Optional[str]  = None
    bg_color:            Optional[str]   = None
    canvas_width:        Optional[int]   = None
    canvas_height:       Optional[int]   = None
    strokes:             Optional[list]  = Field(default=None, max_length=2500)
    telemetry:           Optional[dict]  = None
    chat_count:          Optional[int]   = None
    spotify_query:       Optional[str]   = Field(default=None, max_length=300)
    recommended_song:    Optional[str]   = Field(default=None, max_length=300)
    recommended_artist:  Optional[str]   = Field(default=None, max_length=300)
    ai_reason:           Optional[str]   = Field(default=None, max_length=1000)
    spotify_url:         Optional[str]   = Field(default=None, max_length=1000)


class SpotifyOpenedRequest(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=80)
    db_session_id: str = Field(..., min_length=1, max_length=80)


class RateRequest(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=80)
    db_session_id: str = Field(..., min_length=1, max_length=80)
    score:         int    # 1–5
    song:          Optional[str] = Field(default=None, max_length=300)
    artist:        Optional[str] = Field(default=None, max_length=300)


@app.post("/chat")
def chat_endpoint(req: MessageRequest):
    result = chat(req.session_id, req.message, req.image, req.telemetry)
    return result


@app.post("/playlist-result")
def playlist_result_endpoint(req: MessageRequest):
    data = get_playlist_result(req.session_id)
    print(f"[API] playlist_result from AI: {data}")
    if "error" in data:
        return data
    queries = data.get("queries", [])
    print(f"[API] playlist queries: {queries}")
    playlists = get_playlists(queries)
    print(f"[API] playlists found: {len(playlists)}")
    return {"playlists": playlists}


@app.post("/song-result")
def song_result_endpoint(req: MessageRequest):
    song_data = get_song_result(req.session_id)

    if "error" in song_data:
        return song_data

    song         = (song_data.get("song") or "").replace('"', "")
    artist       = (song_data.get("artist") or "").replace('"', "")
    search_query = song_data.get("search_query")

    track, used_query = None, None

    # No artist requested: keyword search top 3, pick first candidate whose
    # Spotify tags (artist genres) match the session mood; else highest score.
    if not artist and search_query:
        candidates = get_songs(search_query, limit=3)
        if candidates:
            scores = score_song_candidates(req.session_id, candidates)
            print(f"[API] candidate scores: {[(c['name'], s) for c, s in zip(candidates, scores)]}")
            track = next(
                (c for c, s in zip(candidates, scores) if s >= SONG_MATCH_THRESHOLD),
                candidates[scores.index(max(scores))],
            )
            used_query = search_query

    # Artist explicitly requested, or keyword search found nothing:
    # query with increasing looseness; prefer track:/artist: filters.
    if not track:
        queries = []
        if song and artist:
            queries.append(f'track:"{song}" artist:"{artist}"')
        if search_query:
            queries.append(search_query)
        if song or artist:
            queries.append(f"{song} {artist}".strip())
        for q in queries:
            result = get_song(q)
            if result and "error" not in result:
                track, used_query = result, q
                break

    if not track:
        return {"error": "no_track_found"}

    # Card text must match the Spotify link target.
    return {
        "song":          track.get("name"),
        "artist":        track.get("artist"),
        "reason":        song_data.get("reason"),
        "image":         track.get("image"),
        "preview_url":   track.get("preview_url"),
        "spotify_url":   track.get("spotify_url"),
        "album":         track.get("album"),
        "spotify_query": used_query,
    }


def get_user_region(request: Request) -> str:
    """Best-effort country code from IP."""
    try:
        ip = client_ip(request)
        if ip in ("127.0.0.1", "::1"):
            return None
        res = http_requests.get(f"https://ip-api.com/json/{ip}?fields=countryCode", timeout=3)
        return res.json().get("countryCode")
    except Exception:
        return None


@app.post("/session-complete")
def session_complete_endpoint(req: SessionCompleteRequest, request: Request):
    """Called once after song card is shown. Runs AI extraction, saves full row, returns db_session_id."""
    # AI extraction pass over conversation
    features = extract_session_features(req.session_id)
    print(f"[DB] extracted features: {features}")

    # IP-based region
    user_region = get_user_region(request)

    db_id = save_session({
        "frontend_session_id":       req.session_id,
        "drawing_duration_sec":      req.drawing_duration_sec,
        "conversation_duration_sec": req.conversation_duration_sec,
        "device_type":               req.device_type,
        "user_timezone":             req.user_timezone,
        "user_region":               user_region,
        "bg_color":              req.bg_color,
        "canvas_width":          req.canvas_width,
        "canvas_height":         req.canvas_height,
        "strokes":               req.strokes,
        "telemetry":             req.telemetry,
        "conversation":          get_conversation(req.session_id) or None,
        "chat_count":            req.chat_count,
        "language":              features.get("language"),
        "ai_keywords":           features.get("ai_keywords"),
        "ai_style_description":  features.get("ai_style_description"),
        "user_like_likelihood":  features.get("user_like_likelihood"),
        "spotify_query":         req.spotify_query,
        "recommended_song":      req.recommended_song,
        "recommended_artist":    req.recommended_artist,
        "ai_reason":             req.ai_reason,
        "spotify_url":           req.spotify_url,
        "spotify_opened":        False,
        "user_score":            None,
    })
    print(f"[DB] session saved: {db_id}")
    remember_db_session(req.session_id, db_id)
    return {"db_session_id": db_id}


@app.post("/spotify-opened")
def spotify_opened_endpoint(req: SpotifyOpenedRequest):
    """Called when user clicks the Spotify link."""
    if not session_matches_db(req.session_id, req.db_session_id):
        raise HTTPException(status_code=403, detail="session mismatch")
    update_spotify_opened(req.db_session_id)
    return {"ok": True}


@app.post("/rate")
def rate_endpoint(req: RateRequest):
    """Append a song rating to the session's song_ratings array."""
    if not 1 <= req.score <= 5:
        return {"error": "score must be 1–5"}
    if not session_matches_db(req.session_id, req.db_session_id):
        raise HTTPException(status_code=403, detail="session mismatch")
    append_song_rating(req.db_session_id, req.song, req.artist, req.score)
    return {"ok": True}
