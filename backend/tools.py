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


def get_songs(query: str, limit: int = 3) -> list:
    """Search Spotify for tracks. Returns up to `limit` candidates with artist genres."""
    print(f"[Spotify] Searching tracks: {query!r} (limit {limit})")
    try:
        token = get_spotify_token()
        res = requests.get(
            f"https://api.spotify.com/v1/search?q={quote(query)}&type=track&limit={limit}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        ).json()
        items = res.get("tracks", {}).get("items") or []
        artist_ids = list({t["artists"][0]["id"] for t in items if t.get("artists")})
        genres = get_artist_genres(artist_ids, token)
        tracks = []
        for t in items:
            artist = t["artists"][0] if t.get("artists") else {}
            tracks.append({
                "name":        t["name"],
                "artist":      artist.get("name"),
                "album":       t["album"]["name"],
                "image":       t["album"]["images"][0]["url"] if t["album"]["images"] else None,
                "preview_url": t.get("preview_url"),
                "spotify_url": t["external_urls"]["spotify"],
                "genres":      genres.get(artist.get("id"), []),
            })
        print(f"[Spotify] {len(tracks)} candidates for {query!r}")
        return tracks
    except Exception as e:
        print(f"[Spotify] Track search error: {e}")
        return []


def get_artist_genres(artist_ids: list, token: str = None) -> dict:
    """Genres per artist id — Spotify's closest equivalent to track tags."""
    if not artist_ids:
        return {}
    try:
        token = token or get_spotify_token()
        res = requests.get(
            f"https://api.spotify.com/v1/artists?ids={','.join(artist_ids[:50])}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        ).json()
        return {a["id"]: a.get("genres", []) for a in res.get("artists", []) if a}
    except Exception as e:
        print(f"[Spotify] Artist genres error: {e}")
        return {}


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
