# tools.py — external API calls (Spotify)
import os
import requests
import base64
from urllib.parse import quote

SPOTIFY_CLIENT_ID     = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

def get_spotify_token() -> str:
    creds = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
    res = requests.post(
        "https://accounts.spotify.com/api/token",
        data={"grant_type": "client_credentials"},
        headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    token = res.json().get("access_token")
    print(f"[Spotify] Token: {'OK' if token else 'FAILED — ' + str(res.json())}")
    return token

def get_playlists(queries: list) -> list:
    """Search Spotify for one playlist per query. Returns up to 3 playlist dicts."""
    print(f"[Spotify] Searching playlists for queries: {queries}")
    results = []
    try:
        token = get_spotify_token()  # get once, reuse for all 3 queries
    except Exception as e:
        print(f"[Spotify] Token error: {e}")
        return []

    for query in queries[:3]:
        try:
            res = requests.get(
                f"https://api.spotify.com/v1/search?q={quote(query)}&type=playlist&limit=3",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            ).json()
            # Pick first non-None item from results
            items = res.get("playlists", {}).get("items") or []
            print(f"[Spotify] Query {query!r} → {len(items)} results")
            pl = next((p for p in items if p), None)
            if pl:
                results.append({
                    "name":        pl["name"],
                    "owner":       pl["owner"]["display_name"],
                    "image":       pl["images"][0]["url"] if pl.get("images") else None,
                    "tracks":      pl["tracks"]["total"],
                    "description": pl.get("description", ""),
                    "spotify_url": pl["external_urls"]["spotify"],
                })
            else:
                print(f"[Spotify] No playlist found for {query!r}")
        except Exception as e:
            print(f"[Spotify] Error on query {query!r}: {e}")
            continue
    return results


def get_song(query: str) -> dict:
    """Search Spotify for a track. Returns name, artist, album art, spotify URL."""
    print(f"[Spotify] Searching track: {query!r}")
    try:
        token = get_spotify_token()
        res = requests.get(
            f"https://api.spotify.com/v1/search?q={quote(query)}&type=track&limit=1",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        ).json()
        track = res["tracks"]["items"][0]
        print(f"[Spotify] Track found: {track['name']} by {track['artists'][0]['name']}")
        return {
            "name":        track["name"],
            "artist":      track["artists"][0]["name"],
            "album":       track["album"]["name"],
            "image":       track["album"]["images"][0]["url"] if track["album"]["images"] else None,
            "preview_url": track.get("preview_url"),
            "spotify_url": track["external_urls"]["spotify"],
        }
    except Exception as e:
        print(f"[Spotify] Track search error: {e}")
        return {"error": str(e)}
