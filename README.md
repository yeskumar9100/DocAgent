# DocAgent

An AI document assistant that lets you upload PDFs/DOCX/TXT files and ask questions about them in natural language — answers come back grounded in your documents, with clickable citations pointing to the exact source page and chunk.

Built with a Retrieval-Augmented Generation (RAG) pipeline: document chunking → embeddings → FAISS similarity search → LLM generation, with support for multiple AI providers and automatic fallback if one is rate-limited. Installable directly from the browser as a mobile app — no app store required.

**Live app:** https://doc-agent-nu.vercel.app
**Backend API:** https://docagent-ueu0.onrender.com/docs
**Repo:** https://github.com/yeskumar9100/DocAgent

---

## Features

- **Upload & chat** — drop in a PDF, DOCX, or TXT file and ask questions about it immediately
- **Multi-document chat** — scope a conversation to one or several uploaded documents at once
- **Grounded answers with citations** — every answer links back to the exact page/chunk it came from, viewable in the citation panel
- **Multi-provider support** — NVIDIA (default), OpenAI, Anthropic, and Google Gemini, with automatic LLM fallback if your top-priority provider is rate-limited or unavailable
- **Embedding pinning** — each document remembers which provider/model embedded it, so retrieval never breaks from mismatched vector spaces (see [Key Design Decisions](#key-design-decisions))
- **Encrypted key storage** — API keys for any provider are encrypted at rest and never re-displayed in full after saving
- **Document library** — manage, view, and delete previously uploaded documents, with per-document status (processed, processing, error) and chunk counts
- **Installable on mobile** — works as a Progressive Web App with custom icons and splash screen; add it to your phone's home screen like a native app, no app store needed
- **Liquid Glass Dark design system** — a custom glassmorphic UI with squircle geometry, layered blur, and a floating navigation bar, defined as a portable design token spec (`DESIGN.md`)

---

## Architecture

```
                     ┌─────────────────────┐
                     │   Next.js Frontend   │
                     │  (Chat / Upload /    │
                     │  Documents / Settings)│
                     │      — Vercel —       │
                     └──────────┬───────────┘
                                │ REST (JSON), CORS-enabled
                     ┌──────────▼───────────┐
                     │    FastAPI Backend    │
                     │       — Render —      │
                     └──────────┬───────────┘
              ┌─────────────────┼─────────────────┐
              │                 │                 │
    ┌─────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
    │  Document parsing │ │  Provider   │ │  Encrypted key   │
    │  → chunking →     │ │  Router     │ │  store (Fernet)  │
    │  embeddings →     │ │ (LLM        │ │                  │
    │  FAISS index      │ │  fallback)  │ │                  │
    └─────────┬────────┘ └──────┬──────┘ └──────────────────┘
              │                 │
    ┌─────────▼────────┐ ┌──────▼──────────────────┐
    │   FAISS vector    │ │  NVIDIA · OpenAI ·       │
    │   store (per doc) │ │  Anthropic · Google      │
    └───────────────────┘ └──────────────────────────┘
```

**Request flow:**
1. `POST /upload` — file is parsed, split into overlapping chunks, embedded (using the currently-configured embedding provider), and indexed in FAISS. The provider/model used is stored alongside the document record.
2. `POST /ask` — the question is embedded using the *same* provider that indexed the target document(s), FAISS returns the top-k most similar chunks, and those chunks + the question are sent to the LLM (via the Provider Router) to generate a grounded answer with source citations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | FastAPI, async SQLAlchemy |
| Vector search | FAISS |
| Encryption | Fernet (AES-128-CBC + HMAC-SHA256) |
| LLM/Embedding providers | NVIDIA NIM, OpenAI, Anthropic, Google Gemini |
| Hosting | Vercel (frontend), Render (backend) |
| Design | Google Stitch (UI design), Antigravity IDE (implementation) — see [Design System](#design-system) |
| PWA | Custom manifest, icon set, and matched splash background for installable mobile experience |

---

## Prerequisites

- Python 3.11 (see [note on Python version](#a-note-on-python-version) — later versions can break the build)
- Node.js 18+
- An NVIDIA API key from [build.nvidia.com](https://build.nvidia.com) (required as the default provider; other providers are optional and configurable later from the Settings page)

---

## Setup

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate     # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env      # Windows
# cp .env.example .env      # Linux/Mac
# Edit .env: fill in SECRET_KEY and NVIDIA_API_KEY (see below)
```

Generate a valid `SECRET_KEY` — it must be a proper Fernet key, not an arbitrary string:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Paste the output directly into `.env` as `SECRET_KEY=...`, with no extra quotes or whitespace.

```bash
# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs (Swagger UI): **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.local.example .env.local    # if present, otherwise create manually
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

App: **http://localhost:3000**

### 3. Verify it's working

1. Open http://localhost:3000/upload and upload a test PDF.
2. Go to the Chat screen and ask a question about it.
3. Confirm the answer includes citation pills that link back to the source page/chunk in the citation panel.
4. Check http://localhost:8000/docs to confirm `/upload`, `/ask`, `/documents`, and `/settings/providers` are all responding.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Symmetric key used to encrypt/decrypt provider API keys at rest. Must be a valid Fernet key (see generation command above) — an arbitrary string will crash the app on startup with `ValueError: Fernet key must be 32 url-safe base64-encoded bytes`. Never commit this. |
| `NVIDIA_API_KEY` | Yes | Default LLM/embedding provider. Get one from build.nvidia.com. |
| `OPENAI_API_KEY` | No | Optional — can also be added later via the Settings page instead. |
| `ANTHROPIC_API_KEY` | No | Optional — same as above. |
| `GOOGLE_API_KEY` | No | Optional — same as above. |
| `DATABASE_URL` | No | Defaults to local SQLite if unset. Set to a Postgres connection string for production deployments (recommended — see [Deployment](#deployment)). |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of the FastAPI backend, e.g. `http://localhost:8000` locally or `https://docagent-ueu0.onrender.com` in production. |

---

## Design System

DocAgent uses a custom **"Liquid Glass Dark"** design system, defined as a portable token spec in [`DESIGN.md`](./DESIGN.md) — a deep-charcoal glassmorphic theme with translucent floating panels, squircle geometry (24-28px radius on primary containers), and a three-level elevation model.

| Token | Value |
|---|---|
| Background | `#111318` |
| Primary accent | `#0066ff` |
| Headings | Hanken Grotesk |
| Body | Inter |
| Labels/metadata | Geist |
| Glass blur | `backdrop-filter: blur(20px)` |

The floating bottom navigation bar is icon-only (no text labels), positioned with margin from the screen edges so it reads as a floating "island," consistent with the glass aesthetic across every screen — Chat, Document Library, Upload, and Settings.

Logo: a rounded-square document icon with a navy "A" monogram and a connected dot/spark motif, exported with a transparent background at 192px, 512px, and favicon sizes, plus a solid-background variant for `apple-touch-icon`.

---

## Project Structure

```
DocAgent/
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI route handlers
│   │   │   ├── upload.py         # POST /upload
│   │   │   ├── ask.py            # POST /ask (RAG)
│   │   │   ├── documents.py      # GET/DELETE /documents
│   │   │   └── settings.py       # Provider CRUD
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic settings
│   │   │   ├── encryption.py     # Fernet key encryption
│   │   │   └── rag.py            # Text extraction, chunking, FAISS
│   │   ├── db/
│   │   │   ├── database.py       # Async SQLAlchemy
│   │   │   └── models.py         # Document, ProviderConfig
│   │   ├── providers/
│   │   │   ├── base.py           # Abstract LLMProvider
│   │   │   ├── nvidia.py         # NVIDIA NIM (default)
│   │   │   ├── openai_provider.py
│   │   │   ├── anthropic_provider.py
│   │   │   ├── google_provider.py
│   │   │   └── router.py         # ProviderRouter with fallback
│   │   └── main.py               # FastAPI app factory
│   ├── requirements.txt
│   ├── .python-version           # Pins Python 3.11.9 for Render
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/                  # Next.js App Router pages
    │   │   ├── upload/              # Document upload
    │   │   ├── chat/                # AI chat + citations
    │   │   ├── documents/           # Document library
    │   │   ├── settings/            # Provider configuration
    │   │   └── manifest.ts          # PWA manifest (icons, theme colors)
    │   ├── components/
    │   │   ├── layout/              # Floating nav bar
    │   │   ├── upload/               # UploadArea
    │   │   ├── chat/                 # ChatWindow, MessageBubble, CitationPanel
    │   │   ├── documents/            # DocumentLibrary
    │   │   ├── settings/             # SettingsPage, ProviderCard
    │   │   └── states/               # EmptyState, LoadingState, ErrorState
    │   └── lib/
    │       └── api.ts                # Typed API client
    ├── public/                   # Icons, favicon, apple-touch-icon
    ├── DESIGN.md                 # Liquid Glass Dark design token spec
    └── .env.local
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload a document (PDF/DOCX/TXT), chunk it, embed it, and index it in FAISS |
| `POST` | `/ask` | Ask a question, scoped to one or more uploaded documents |
| `GET` | `/documents` | List all uploaded documents with metadata |
| `DELETE` | `/documents/{id}` | Remove a document and its vector index |
| `POST` | `/settings/providers` | Add or update an encrypted API key for a provider |
| `GET` | `/settings/providers` | List configured providers and their status (never returns raw keys) |
| `DELETE` | `/settings/providers/{provider}` | Remove a configured provider |
| `GET` | `/health` | Health check (also used by Render's health monitor) |

Full interactive documentation is available at `/docs` (Swagger UI) once the backend is running: https://docagent-ueu0.onrender.com/docs

---

## Key Design Decisions

### Embedding Pinning

Each document stores which provider and model embedded it. When answering a question, DocAgent always uses the **same embedding provider** that indexed the document — it never falls back to a different one for embeddings. This matters because vectors from different embedding models live in different, non-comparable vector spaces; mixing them silently breaks similarity search. If you switch embedding providers in Settings, existing documents keep using their original provider until you explicitly re-embed them.

### Provider Fallback (LLM only)

The `ProviderRouter` tries configured providers in priority order, but **only for the generation step** — never for embeddings, for the reason above. On a rate-limit or quota error, it backs off that provider for 60 seconds and automatically retries the next one in the priority list. If every configured provider fails, the request returns an error rather than silently degrading.

### Key Security

API keys are encrypted with Fernet (AES-128-CBC + HMAC-SHA256) before being stored. The decryption key (`SECRET_KEY`) lives only in the environment — never in the database alongside the ciphertext, and never in source control. The frontend never receives a saved key back in full; only a masked `••••••••last4` representation is returned after saving.

---

## Deployment

DocAgent runs as two separately deployed services: the frontend on Vercel, the backend on Render. They can't currently be consolidated onto Vercel alone, because the backend relies on a persistent local FAISS index and SQLite database — Vercel's serverless functions don't retain local disk state between invocations. (Migrating to Supabase/pgvector, see [Roadmap](#roadmap), would remove this constraint.)

| Component | Platform | Notes |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Free tier, connects directly to this repo's `frontend/` folder |
| Backend | [Render](https://render.com) | Free tier; spins down after 15 min idle (cold start ~30-50s on first request after inactivity) |
| Vector DB / metadata | Currently local FAISS + SQLite on Render | No persistent disk on the free tier — a restart clears the index. Consider [Supabase](https://supabase.com) (Postgres + `pgvector`) for production persistence. |

**Steps:**
1. Deploy `backend/` to Render as a Web Service, root directory `backend`. Build command: `pip install -r requirements.txt`. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
2. Add environment secrets: `SECRET_KEY` (a real Fernet key, not an arbitrary string) and `NVIDIA_API_KEY`.
3. Deploy `frontend/` to Vercel, root directory `frontend`. Set `NEXT_PUBLIC_API_URL` to the Render backend URL.
4. In the backend's CORS configuration, allow the Vercel domain as an origin (plus `localhost:3000` for local dev).
5. Test the full upload → ask → cite flow on the live URLs — CORS and cold-start behavior only show up in production, not local dev.

Both platforms auto-redeploy on every `git push` to `main` once connected — no manual re-upload needed after initial setup.

### A note on Python version

Render's default Python version updates over time and may not have pre-built wheels for every dependency (notably `pydantic-core`) — this caused a build failure where pip fell back to compiling from source via Rust/`maturin`, which then failed on Render's read-only build filesystem. Fixed by pinning the version explicitly with a `.python-version` file at the backend root (Render's currently-supported method — the older Heroku-style `runtime.txt` convention is **not** read by Render):
```
3.11.9
```
Alternatively, set the `PYTHON_VERSION` environment variable directly in Render's dashboard (takes precedence over the file).

### Using it on mobile

No app store needed — DocAgent installs as a Progressive Web App directly from the browser, with a custom icon, dark splash background matched to the app theme (avoiding a white-flash flicker on launch), and standalone display mode:
- **iPhone (Safari):** open the deployed site → Share icon → "Add to Home Screen"
- **Android (Chrome):** open the deployed site → ⋮ menu → "Add to Home Screen" / "Install app"

If you update the app icon and it doesn't appear to change after reinstalling, clear the existing home screen shortcut first — icons are cached at install time.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Render build fails with `maturin failed` / `Read-only file system` | Render defaulted to a Python version without a pre-built `pydantic-core` wheel | Pin Python via `.python-version` (see above), then "Clear build cache & deploy" |
| `ValueError: Fernet key must be 32 url-safe base64-encoded bytes` on startup | `SECRET_KEY` is not a valid Fernet key | Regenerate with the command in [Environment Variables](#environment-variables) and paste it exactly, with no extra whitespace |
| Upload/ask requests fail silently from the deployed frontend | CORS not configured for the Vercel domain | Add the Vercel URL to `CORSMiddleware`'s `allow_origins` in `main.py` |
| Root URL (`/`) returns `{"detail":"Not Found"}` | Expected — no route is defined for `/` | Use `/docs` or `/health` to verify the backend is live; add a root route if a friendlier response is wanted |
| Installed PWA icon shows a generic/platform default instead of the app logo | Manifest icons missing or pointing to placeholder files | Regenerate and link icons per [Design System](#design-system); clear the old home screen shortcut and reinstall |
| White flash/flicker when launching the installed PWA | Manifest `background_color` didn't match the app's actual theme background | Set `background_color` and `theme_color` in the manifest to `#111318` |

---

## Roadmap

- [x] Multi-provider settings with encrypted key storage and LLM fallback
- [x] PWA manifest, custom icons, and matched splash background
- [x] Deployed to Vercel (frontend) + Render (backend)
- [ ] Document outline/preview panel in the chat sidebar
- [ ] Persistent vector storage via Supabase/pgvector for production deployments (also unlocks single-platform Vercel deployment)
- [ ] Retrieval evaluation harness (Hit Rate@k / MRR@k) to benchmark chunking strategies and reranking
- [ ] Optional cross-encoder reranker as a second retrieval stage
- [ ] Investigate and fix document indexing errors (occasional "Error" status on upload)

---

## License

_Add a license (e.g. MIT) here if you intend for others to use or contribute to this code._
