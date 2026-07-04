# DrawToPlay

Draw your mood, chat with the AI, and get a Spotify song match.

## Local development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# create backend/.env with the values in the table below
uvicorn main:app --reload --port 8080
```

### Frontend

Serve `frontend/` with any static server on port 8080 or 5173. The app auto-uses `http://localhost:8080` as the API when opened from localhost.

```bash
cd frontend
python -m http.server 8080
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | yes | OpenAI API key for chat and song selection |
| `SPOTIFY_CLIENT_ID` | yes | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | yes | Spotify app client secret |
| `DB_HOST` | yes | PostgreSQL host |
| `DB_PORT` | no | PostgreSQL port (default 5432) |
| `DB_NAME` | yes | Database name |
| `DB_USER` | yes | Database user |
| `DB_PASSWORD` | yes | Database password |
| `ALLOWED_ORIGINS` | prod | Comma-separated frontend origins for CORS (e.g. `https://your-app.example`) |
| `TRUST_PROXY` | prod | Set `true` when behind AWS ALB/App Runner so rate limiting uses `X-Forwarded-For` |
| `RATE_LIMIT_MAX` | no | Max requests per IP per window (default 60) |
| `RATE_LIMIT_WINDOW_SEC` | no | Rate limit window in seconds (default 60) |
| `SESSION_LINK_TTL_SEC` | no | In-memory session link TTL (default 7200) |

## Database setup

```bash
psql "$DATABASE_URL" -f backend/migrations/001_create_sessions.sql
```

## Deploy checklist

1. Run migration on production PostgreSQL.
2. Set `ALLOWED_ORIGINS` to your production frontend URL(s).
3. Set `TRUST_PROXY=true` if the service sits behind a load balancer.
4. Build and push Docker image tagged with git SHA (not only `latest`).
5. Verify `GET /health` returns `{"status":"ok"}`.

## Analysis

Session review notebook: `analysis/explore_sessions.ipynb`
