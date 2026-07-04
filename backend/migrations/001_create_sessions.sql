-- DrawToPlay sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frontend_session_id     TEXT NOT NULL UNIQUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    drawing_duration_sec    INTEGER,
    conversation_duration_sec INTEGER,
    device_type             TEXT,
    user_timezone           TEXT,
    user_region             TEXT,
    bg_color                TEXT,
    canvas_width            INTEGER,
    canvas_height           INTEGER,
    strokes                 JSONB,
    telemetry               JSONB,
    conversation            JSONB,
    chat_count              INTEGER,
    language                TEXT,
    ai_keywords             JSONB,
    ai_style_description    TEXT,
    user_like_likelihood    INTEGER,
    spotify_query           TEXT,
    recommended_song        TEXT,
    recommended_artist      TEXT,
    ai_reason               TEXT,
    spotify_url             TEXT,
    spotify_opened          BOOLEAN NOT NULL DEFAULT FALSE,
    song_ratings            JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_score              INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_frontend_session_id ON sessions (frontend_session_id);
