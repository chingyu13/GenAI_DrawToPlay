# database.py — PostgreSQL session storage
import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_conn():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def save_session(data: dict):
    """Upsert session row keyed by frontend_session_id.
    First song reveal → INSERT. Follow-up songs → UPDATE song fields only.
    Drawing/telemetry/strokes are never overwritten after the first insert.
    """
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO sessions (
            frontend_session_id,
            drawing_duration_sec, conversation_duration_sec, device_type, user_timezone, user_region,
            bg_color, canvas_width, canvas_height, strokes,
            telemetry, conversation, chat_count, language,
            ai_keywords, ai_style_description, user_like_likelihood,
            spotify_query, recommended_song, recommended_artist,
            ai_reason, spotify_url, spotify_opened
        ) VALUES (
            %(frontend_session_id)s,
            %(drawing_duration_sec)s, %(conversation_duration_sec)s, %(device_type)s, %(user_timezone)s, %(user_region)s,
            %(bg_color)s, %(canvas_width)s, %(canvas_height)s, %(strokes)s,
            %(telemetry)s, %(conversation)s, %(chat_count)s, %(language)s,
            %(ai_keywords)s, %(ai_style_description)s, %(user_like_likelihood)s,
            %(spotify_query)s, %(recommended_song)s, %(recommended_artist)s,
            %(ai_reason)s, %(spotify_url)s, FALSE
        )
        ON CONFLICT (frontend_session_id) DO UPDATE SET
            conversation_duration_sec = EXCLUDED.conversation_duration_sec,
            chat_count                = EXCLUDED.chat_count,
            language                  = EXCLUDED.language,
            ai_keywords               = EXCLUDED.ai_keywords,
            ai_style_description      = EXCLUDED.ai_style_description,
            user_like_likelihood      = EXCLUDED.user_like_likelihood,
            spotify_query             = EXCLUDED.spotify_query,
            recommended_song          = EXCLUDED.recommended_song,
            recommended_artist        = EXCLUDED.recommended_artist,
            ai_reason                 = EXCLUDED.ai_reason,
            spotify_url               = EXCLUDED.spotify_url,
            spotify_opened            = FALSE
        RETURNING id;
    """, {
        "frontend_session_id":       data.get("frontend_session_id"),
        "drawing_duration_sec":      data.get("drawing_duration_sec"),
        "conversation_duration_sec": data.get("conversation_duration_sec"),
        "device_type":               data.get("device_type"),
        "user_timezone":             data.get("user_timezone"),
        "user_region":               data.get("user_region"),
        "bg_color":                  data.get("bg_color"),
        "canvas_width":              data.get("canvas_width"),
        "canvas_height":             data.get("canvas_height"),
        "strokes":              json.dumps(data["strokes"])      if data.get("strokes")      else None,
        "telemetry":            json.dumps(data["telemetry"])    if data.get("telemetry")    else None,
        "conversation":         json.dumps(data["conversation"]) if data.get("conversation") else None,
        "chat_count":           data.get("chat_count"),
        "language":             data.get("language"),
        "ai_keywords":          json.dumps(data["ai_keywords"])  if data.get("ai_keywords")  else None,
        "ai_style_description": data.get("ai_style_description"),
        "user_like_likelihood": data.get("user_like_likelihood"),
        "spotify_query":        data.get("spotify_query"),
        "recommended_song":     data.get("recommended_song"),
        "recommended_artist":   data.get("recommended_artist"),
        "ai_reason":            data.get("ai_reason"),
        "spotify_url":          data.get("spotify_url"),
    })
    session_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return str(session_id)


def update_spotify_opened(session_id: str):
    """Mark that the user clicked through to Spotify."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE sessions SET spotify_opened = TRUE WHERE id = %s;",
        (session_id,)
    )
    conn.commit()
    cur.close()
    conn.close()


def append_song_rating(db_session_id: str, song: str, artist: str, score: int):
    """Append a rating entry to the song_ratings JSONB array."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE sessions
        SET song_ratings = song_ratings || jsonb_build_array(
            jsonb_build_object(
                'song',     %s,
                'artist',   %s,
                'score',    %s,
                'rated_at', NOW()::text
            )
        )
        WHERE id = %s;
    """, (song, artist, score, db_session_id))
    conn.commit()
    cur.close()
    conn.close()
