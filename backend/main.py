# main.py — FastAPI entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from agent import chat, get_song_result, get_playlist_result
from tools import get_song, get_playlists

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MessageRequest(BaseModel):
    message:    str
    session_id: str
    image:      Optional[str]  = None  # base64 data URL, first message only
    telemetry:  Optional[dict] = None  # behavioral signals from frontend


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
