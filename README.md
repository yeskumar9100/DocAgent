# DocAgent

An AI document assistant that lets you upload PDFs/DOCX/TXT files and ask questions about them in natural language — answers come back grounded in your documents, with clickable citations pointing to the exact source page and chunk.

Built with a Retrieval-Augmented Generation (RAG) pipeline: document chunking → embeddings → FAISS similarity search → LLM generation, with support for multiple AI providers and automatic fallback if one is rate-limited.

**Live demo:** _add your Vercel URL here once deployed_
**Repo:** https://github.com/yeskumar9100/DocAgent

---

## Features

- **Upload & chat** — drop in a PDF, DOCX, or TXT file and ask questions about it immediately
- **Multi-document chat** — scope a conversation to one or several uploaded documents at once
- **Grounded answers with citations** — every answer links back to the exact page/chunk it came from, viewable in the citation panel
- **Multi-provider support** — NVIDIA (default), OpenAI, Anthropic, and Google Gemini, with automatic LLM fallback if your top-priority provider is rate-limited or unavailable
- **Embedding pinning** — each document remembers which provider/model embedded it, so retrieval never breaks from mismatched vector spaces (see [Key Design Decisions](#key-design-decisions))
- **Encrypted key storage** — API keys for any provider are encrypted at rest and never re-displayed in full after saving
- **Document library** — manage, view, and delete previously uploaded documents
- **Installable on mobile** — works as a Progressive Web App; add it to your phone's home screen like a native app

---

## Architecture

```
                     ┌─────────────────────┐
                     │   Next.js Frontend   │
                     │  (Chat / Upload /    │
                     │  Documents / Settings)│
                     └──────────┬───────────┘
                                │ REST (JSON)
                     ┌──────────▼───────────┐
                     │    FastAPI Backend    │
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
| Design | Google Stitch (UI design), Antigravity IDE (implementation) |

---

## Prerequisites

- Python 3.10+
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
# Edit .env: fill in SECRET_KEY (see instructions in file) and NVIDIA_API_KEY

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
| `SECRET_KEY` | Yes | Symmetric key used to encrypt/decrypt provider API keys at rest. Generate one with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. Never commit this. |
| `NVIDIA_API_KEY` | Yes | Default LLM/embedding provider. Get one from build.nvidia.com. |
| `OPENAI_API_KEY` | No | Optional — can also be added later via the Settings page instead. |
| `ANTHROPIC_API_KEY` | No | Optional — same as above. |
| `GOOGLE_API_KEY` | No | Optional — same as above. |
| `DATABASE_URL` | No | Defaults to local SQLite if unset. Set to a Postgres connection string for production deployments (recommended — see [Deployment](#deployment)). |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of the FastAPI backend, e.g. `http://localhost:8000` locally or your deployed Render URL in production. |

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
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/                  # Next.js App Router pages
    │   │   ├── upload/              # Document upload
    │   │   ├── chat/                # AI chat + citations
    │   │   ├── documents/           # Document library
    │   │   └── settings/            # Provider configuration
    │   ├── components/
    │   │   ├── layout/              # Sidebar / navigation
    │   │   ├── upload/               # UploadArea
    │   │   ├── chat/                 # ChatWindow, MessageBubble, CitationPanel
    │   │   ├── documents/            # DocumentLibrary
    │   │   ├── settings/             # SettingsPage, ProviderCard
    │   │   └── states/               # EmptyState, LoadingState, ErrorState
    │   └── lib/
    │       └── api.ts                # Typed API client
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
| `GET` | `/health` | Health check |

Full interactive documentation is available at `/docs` (Swagger UI) once the backend is running.

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

DocAgent deploys as two services: the frontend on Vercel, the backend on Render.

| Component | Platform | Notes |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Free tier, connects directly to this repo's `frontend/` folder |
| Backend | [Render](https://render.com) | Free tier available; spins down after 15 min idle (cold start ~30-50s on first request after inactivity) |
| Vector DB / metadata | Consider [Supabase](https://supabase.com) (Postgres + `pgvector`) for production | Render's free tier has no persistent disk, so local SQLite/FAISS files do not survive a restart — either accept re-indexing on cold start, or move to a hosted persistent store |

**Steps:**
1. Deploy `backend/` to Render as a Web Service. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Add `SECRET_KEY` and `NVIDIA_API_KEY` (and any other provider keys) as environment secrets.
2. Deploy `frontend/` to Vercel. Set `NEXT_PUBLIC_API_URL` to your Render backend URL.
3. In the backend's CORS configuration, allow your Vercel domain as an origin.
4. Test the full upload → ask → cite flow on the live URLs before considering it done — CORS and cold-start behavior only show up in production, not in local dev.

### Using it on mobile

No app store needed — DocAgent works as an installable Progressive Web App:
- **iPhone (Safari):** open the deployed site → Share icon → "Add to Home Screen"
- **Android (Chrome):** open the deployed site → ⋮ menu → "Add to Home Screen" / "Install app"

---

## Roadmap

- [ ] Document outline/preview panel in the chat sidebar
- [ ] Full PWA manifest + service worker for offline asset caching
- [ ] Persistent vector storage via Supabase/pgvector for production deployments
- [ ] Retrieval evaluation harness (Hit Rate@k / MRR@k) to benchmark chunking strategies and reranking
- [ ] Optional cross-encoder reranker as a second retrieval stage

---

## License

_Add a license (e.g. MIT) here if you intend for others to use or contribute to this code._
