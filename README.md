# DrawToPlay

**Draw your mood. Chat with AI. Get a Spotify song that fits.**

[Live app](https://drawtoplay.chingyu.site) · Vanilla JS canvas + FastAPI + GPT-4o + Spotify

---

## About

DrawToPlay is a small creative web app: pick a background color, draw how you feel, then talk with an AI that reads your drawing (and how you drew it). It recommends a Spotify track — or playlists on request — and saves anonymized session data for research and review.

No login. No Spotify account required for the user.

---

## Features

- **Color-first landing** — animated gradient background, tap to lock your mood color
- **Drawing canvas** — pen, eraser, undo; eye hint animation; responsive stroke width
- **Multimodal AI chat** — GPT-4o vision + conversation in the user's browser language
- **Song match** — AI picks mood + search strategy → Spotify track card with preview link
- **Playlists** — optional 3 playlist suggestions from different angles
- **Session telemetry** — drawing duration, stroke stats, chat flow saved to PostgreSQL
- **i18n UI** — copy adapts to `navigator.language` (en, zh-TW, zh-CN, ja, ko, es, de, ar, …)

---

## How it works

```
1. Pick color  →  2. Draw  →  3. Chat  →  4. Song card (+ rating)
                      ↓
              JPEG + telemetry → /chat
                      ↓
         GPT-4o reply → /song-result → Spotify
                      ↓
              /session-complete → PostgreSQL
```

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | HTML, CSS, Canvas API, vanilla JS |
| Backend | Python 3.11, FastAPI, LangChain, OpenAI |
| Music | Spotify Web API (client credentials) |
| Database | PostgreSQL |
| Deploy | Netlify (frontend), AWS ECS Express + ECR + RDS (backend) |

---

## Project structure

```
GenAI_DrawToPlay/
├── frontend/          # Static SPA (index.html, style.css, app.js)
├── backend/
│   ├── main.py        # API routes
│   ├── agent.py       # LLM prompts & chat logic
│   ├── tools.py       # Spotify helpers
│   ├── database.py    # PostgreSQL access
│   ├── Dockerfile
│   └── migrations/    # SQL schema
└── analysis/
    └── explore_sessions.ipynb   # Session review notebook
```

---

## Getting started

### Prerequisites

- Python 3.11+
- Node not required (static frontend)
- PostgreSQL (local or RDS)
- OpenAI API key
- Spotify Developer app (Client ID + Secret)

### 1. Clone & backend

```bash
git clone <your-repo-url>
cd GenAI_DrawToPlay/backend

python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` (never commit this file):

```env
OPENAI_API_KEY=sk-...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drawtoplay
DB_USER=postgres
DB_PASSWORD=...
```

Run the API:

```bash
uvicorn main:app --reload --port 8080
```

Health check: [http://localhost:8080/health](http://localhost:8080/health) → `{"status":"ok"}`

### 2. Database

```bash
psql "$DATABASE_URL" -f backend/migrations/001_create_sessions.sql
```

### 3. Frontend

In a second terminal:

```bash
cd frontend
python3 -m http.server 5173
```

Open [http://localhost:5173](http://localhost:5173)

The app uses `http://localhost:8080` as the API when the hostname is `localhost` or `127.0.0.1`.

> **Note:** Run backend on **8080** and frontend on **5173** (not both on 8080).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `SPOTIFY_CLIENT_ID` | Yes | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes | Spotify app client secret |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `DB_PORT` | No | Default `5432` |
| `ALLOWED_ORIGINS` | Prod | Comma-separated frontend URLs for CORS |
| `TRUST_PROXY` | Prod | Set `true` behind AWS load balancer |
| `RATE_LIMIT_MAX` | No | Default `60` |
| `RATE_LIMIT_WINDOW_SEC` | No | Default `60` |
| `SESSION_LINK_TTL_SEC` | No | Default `7200` |

---

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check |
| `POST` | `/chat` | AI conversation (+ optional drawing image) |
| `POST` | `/song-result` | Resolve recommended track on Spotify |
| `POST` | `/playlist-result` | Fetch playlist options |
| `POST` | `/session-complete` | Persist session + AI-extracted features |
| `POST` | `/spotify-opened` | Log Spotify link click |
| `POST` | `/rate` | Append song rating |

---

## Deployment

### Backend (AWS ECS)

```bash
# Build & push Docker image to ECR
bash backend/migrate-to-sydney.sh

# Roll out new image
aws ecs update-service \
  --cluster default \
  --service drawtoplay-backend-9d61 \
  --region ap-southeast-2 \
  --force-new-deployment
```

Production checklist:

1. Run DB migration on RDS
2. Set `ALLOWED_ORIGINS` to your frontend URL (e.g. `https://drawtoplay.chingyu.site`)
3. Set `TRUST_PROXY=true` on the ECS task definition
4. Confirm `/health` returns 200 after deploy (~7–10 min rollout)

Env vars live in the **ECS task definition**, not in the Docker image.

### Frontend (Netlify)

Drag the `frontend/` folder to [Netlify Drop](https://app.netlify.com/drop), or:

```bash
npm install -g netlify-cli
netlify deploy --prod --dir frontend/
```

Update `DEPLOYED_API_BASE` in `frontend/app.js` if your backend URL changes.

---

## Session analysis

Use `analysis/explore_sessions.ipynb` to inspect saved sessions: local time, drawings, conversation, telemetry, and ratings. Requires DB credentials in `backend/.env`.

---

## License

Private / all rights reserved unless otherwise specified by the repository owner.
