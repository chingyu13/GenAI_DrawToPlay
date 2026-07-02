# main.py — FastAPI entry point
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from agent import chat, get_song_result, get_playlist_result, extract_session_features
from tools import get_song, get_playlists
from database import save_session, update_spotify_opened, append_song_rating
import requests as http_requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.get("/health")
def health():
    return {"status": "ok"}

class MessageRequest(BaseModel):
    message:    str
    session_id: str
    image:      Optional[str]  = None
    telemetry:  Optional[dict] = None


class SessionCompleteRequest(BaseModel):
    session_id:                str
    drawing_duration_sec:      Optional[int]  = None
    conversation_duration_sec: Optional[int]  = None
    device_type:               Optional[str]  = None
    user_timezone:             Optional[str]  = None
    bg_color:            Optional[str]   = None
    canvas_width:        Optional[int]   = None
    canvas_height:       Optional[int]   = None
    strokes:             Optional[list]  = None
    telemetry:           Optional[dict]  = None
    chat_count:          Optional[int]   = None
    spotify_query:       Optional[str]   = None
    recommended_song:    Optional[str]   = None
    recommended_artist:  Optional[str]   = None
    ai_reason:           Optional[str]   = None
    spotify_url:         Optional[str]   = None


class SpotifyOpenedRequest(BaseModel):
    db_session_id: str


class RateRequest(BaseModel):
    db_session_id: str
    score:         int    # 1–5
    song:          Optional[str] = None
    artist:        Optional[str] = None


# ─── EXISTING ENDPOINTS (unchanged) ────────────────────────

@app.post("/chat")
async def chat_endpoint(req: MessageRequest):
    result = chat(req.session_id, req.message, req.image, req.telemetry)
    return result


@app.post("/playlist-result")
async def playlist_result_endpoint(req: MessageRequest):
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
async def song_result_endpoint(req: MessageRequest):
    song_data = get_song_result(req.session_id)

    if "error" in song_data:
        return song_data

    search_query = song_data.get("search_query") or f"{song_data.get('song')} {song_data.get('artist')}"
    track = get_song(search_query)

    return {
        "song":        song_data.get("song"),
        "artist":      song_data.get("artist"),
        "reason":      song_data.get("reason"),
        "image":       track.get("image"),
        "preview_url": track.get("preview_url"),
        "spotify_url": track.get("spotify_url"),
        "album":       track.get("album"),
    }


# ─── NEW ENDPOINTS ──────────────────────────────────────────

def get_user_region(request: Request) -> str:
    """Best-effort country code from IP."""
    try:
        ip = request.headers.get("x-forwarded-for", request.client.host).split(",")[0].strip()
        if ip in ("127.0.0.1", "::1"):
            return None
        res = http_requests.get(f"https://ip-api.com/json/{ip}?fields=countryCode", timeout=3)
        return res.json().get("countryCode")
    except Exception:
        return None


@app.post("/session-complete")
async def session_complete_endpoint(req: SessionCompleteRequest, request: Request):
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
        "conversation":          None,   # stored in session_memories, not sent over wire
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
    return {"db_session_id": db_id}


@app.post("/spotify-opened")
async def spotify_opened_endpoint(req: SpotifyOpenedRequest):
    """Called when user clicks the Spotify link."""
    update_spotify_opened(req.db_session_id)
    return {"ok": True}


@app.post("/rate")
async def rate_endpoint(req: RateRequest):
    """Append a song rating to the session's song_ratings array."""
    if not 1 <= req.score <= 5:
        return {"error": "score must be 1–5"}
    append_song_rating(req.db_session_id, req.song, req.artist, req.score)
    return {"ok": True}
