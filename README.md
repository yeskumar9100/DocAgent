# DocAgent — AI Document Assistant

An AI document assistant that lets you upload PDFs, DOCX, and TXT files and ask questions about them in natural language — answers come back grounded in your documents with verified clickable citations pointing to the exact source page and chunk.

Built with a Retrieval-Augmented Generation (RAG) pipeline: document chunking → embeddings → FAISS similarity search → LLM generation, featuring multi-provider routing with automatic LLM fallback and an ultra-premium **Liquid Glass Dark** design system.

- **Live Demo:** [https://doc-agent-nu.vercel.app](https://doc-agent-nu.vercel.app)
- **Repository:** [https://github.com/yeskumar9100/DocAgent](https://github.com/yeskumar9100/DocAgent)

---

## 🌟 Key Features

- 📄 **Upload & Chat** — Drop in PDF, DOCX, or TXT files and query them immediately.
- 📚 **Multi-Document RAG** — Select one or multiple documents simultaneously to query across your library.
- 🎯 **Verifiable Citations** — Every generated answer includes clickable citation pills linking directly to source text chunks.
- ⚡ **Multi-Provider Routing & Fallback** — Integrates NVIDIA NIM (default), OpenAI, Anthropic Claude, and Google Gemini with automatic LLM fallback if rate-limited.
- 📌 **Embedding Pinning** — Documents preserve the exact provider and vector model used to embed them, preventing mismatched vector space errors.
- 🔐 **Encrypted Key Storage** — Provider API keys are encrypted at rest using AES-128-CBC (Fernet) and never displayed in full.
- 👤 **Account & Guest Management** — Settings section with account profile details, guest session support, and explicit Log Out / Exit actions.
- 💎 **Liquid Glass Dark UI** — Translucent deep glass modules with simulate beveled inner borders, squircle geometry, and typography powered by *Hanken Grotesk*, *Inter*, and *Geist*.
- 📱 **Zero-Flicker Mobile PWA** — Installable Progressive Web App with maskable icons, zero-FOUC launch sequence, and optimized mobile touch navigation.

---

## 🏗️ Architecture

```
                     ┌────────────────────────┐
                     │    Next.js Frontend    │
                     │  (Vercel Deployment)   │
                     └───────────┬────────────┘
                                 │ REST (JSON / CORS)
                     ┌───────────▼────────────┐
                     │     FastAPI Backend    │
                     │  (Render Deployment)   │
                     └───────────┬────────────┘
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐
    │ Document Parsing │  │  Provider   │  │  Encrypted Key  │
    │ → Chunking →     │  │  Router     │  │  Store (Fernet) │
    │ Embeddings →     │  │ (LLM        │  │                 │
    │ FAISS Index      │  │  Fallback)  │  │                 │
    └─────────┬────────┘  └──────┬──────┘  └─────────────────┘
              │                  │
    ┌─────────▼────────┐  ┌──────▼──────────────────┐
    │  FAISS Vector    │  │  NVIDIA · OpenAI ·      │
    │  Store (per doc) │  │  Anthropic · Google     │
    └──────────────────┘  └─────────────────────────┘
```

### Request Flow
1. **`POST /upload`**: File text is extracted, split into overlapping chunks, embedded using the configured provider, and indexed in FAISS. The provider and embedding model parameters are pinned to the document record.
2. **`POST /ask`**: The query is embedded using the *same* provider that indexed the target document(s). FAISS retrieves top-k relevant chunks, which are sent to the LLM (via the `ProviderRouter`) to generate a grounded response with source citations.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS |
| **Backend** | FastAPI 0.115, Python 3.11, async SQLAlchemy, aiosqlite |
| **Vector Engine** | FAISS (`faiss-cpu`) |
| **Security** | Fernet AES-128-CBC encryption for API credentials at rest |
| **LLM Providers** | NVIDIA NIM (default), OpenAI GPT-4o, Anthropic Claude 3.5, Google Gemini 1.5 |
| **Design System** | **Liquid Glass Dark** (Deep Glass panels, 28px squircles, Hanken Grotesk & Geist fonts) |
| **PWA & Web** | PWA Manifest with maskable icons, zero-FOUC inline theme script |

---

## 📋 Prerequisites

- **Python 3.11** (recommended; pinned via `backend/runtime.txt`)
- **Node.js 18+**
- An **NVIDIA API key** from [build.nvidia.com](https://build.nvidia.com) (default provider)

---

## 🚀 Quick Start & Setup

### 1. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate     # Windows
# source venv/bin/activate  # Linux/Mac

# Install pinned dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env      # Windows
# cp .env.example .env      # Linux/Mac

# Edit .env and set SECRET_KEY and NVIDIA_API_KEY

# Launch FastAPI dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **API Documentation (Swagger UI):** `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure local API URL
# .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000

# Launch Next.js dev server
npm run dev
```

- **Web Application:** `http://localhost:3000`

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Fernet symmetric key for encrypting provider API keys at rest. Generate via `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. |
| `NVIDIA_API_KEY` | Yes | Default provider key from build.nvidia.com. |
| `OPENAI_API_KEY` | No | Optional — can also be added via the Settings UI. |
| `ANTHROPIC_API_KEY` | No | Optional — added via Settings UI. |
| `GOOGLE_API_KEY` | No | Optional — added via Settings UI. |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins (e.g. `https://doc-agent-nu.vercel.app,http://localhost:3000`). |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | URL of backend API (`http://localhost:8000` locally, or deployed Render URL). |

---

## 📂 Project Structure

```
DocAgent/
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI endpoint routes (/upload, /ask, /documents, /settings)
│   │   ├── core/              # Config, Fernet encryption, RAG pipeline & FAISS
│   │   ├── db/                # SQLAlchemy async models & SQLite database
│   │   ├── providers/         # ProviderRouter, NVIDIA, OpenAI, Anthropic, Google implementations
│   │   └── main.py            # FastAPI app factory & CORS middleware
│   ├── runtime.txt            # Python version pin (python-3.11.9 for Render)
│   └── requirements.txt       # Stable wheel-pinned Python dependencies
│
└── frontend/
    ├── public/                # PWA icons, logo assets & manifest.json
    └── src/
        ├── app/               # Next.js App Router (Dashboard, Upload, Chat, Documents, Settings)
        ├── components/        # Glassmorphic UI components, floating navbar, sidebar, cards
        ├── context/           # ThemeProvider (Dark/Light) & AuthProvider (Guest/Login)
        └── lib/               # Typed API client
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload PDF/DOCX/TXT file, chunk, embed, and index into FAISS |
| `POST` | `/ask` | Execute RAG query against selected document(s) with citations |
| `GET` | `/documents` | List uploaded documents, size, status, and chunk counts |
| `DELETE` | `/documents/{id}` | Delete document and remove its vector index |
| `GET` | `/settings/providers` | List configured providers and connection status |
| `POST` | `/settings/providers` | Save encrypted API key for a provider |
| `DELETE` | `/settings/providers/{p}` | Remove a provider configuration |
| `GET` | `/health` | Uptime and provider health check |

---

## 🌐 Deployment

| Service | Platform | Link / Config |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | [https://doc-agent-nu.vercel.app](https://doc-agent-nu.vercel.app) |
| **Backend** | [Render](https://render.com) | Root directory: `backend`, Python 3.11 runtime |

### Render Deployment Notes
- `backend/runtime.txt` pins **`python-3.11.9`** to prevent Render from using unreleased Python versions that require source compilation.
- `requirements.txt` pins stable package wheels (`fastapi==0.115.0`, `pydantic==2.9.2`, `pydantic-core==2.23.4`) to ensure pre-built wheels are installed without Rust compilation errors.

---

## 📱 Mobile PWA Installation

Install DocAgent directly to your phone's home screen with zero app store overhead:
- **iOS (Safari):** Open [https://doc-agent-nu.vercel.app](https://doc-agent-nu.vercel.app) → Share → **Add to Home Screen**
- **Android (Chrome):** Open [https://doc-agent-nu.vercel.app](https://doc-agent-nu.vercel.app) → `⋮` Menu → **Install App** / **Add to Home Screen**

---

## 📄 License

Distributed under the MIT License.
