# DocAgent — Quick Start

## Prerequisites
- Python 3.10+ 
- Node.js 18+
- An NVIDIA API key from [build.nvidia.com](https://build.nvidia.com)

## Setup

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate    # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env: fill in SECRET_KEY (see instructions in file) and NVIDIA_API_KEY

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

# Install dependencies (already done if you ran setup)
npm install

# Start dev server
npm run dev
```

App available at: http://localhost:3000

## Architecture

```
DocAgent/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route handlers
│   │   │   ├── upload.py    # POST /upload
│   │   │   ├── ask.py       # POST /ask (RAG)
│   │   │   ├── documents.py # GET/DELETE /documents
│   │   │   └── settings.py  # Provider CRUD
│   │   ├── core/
│   │   │   ├── config.py    # Pydantic settings
│   │   │   ├── encryption.py # Fernet key encryption
│   │   │   └── rag.py       # Text extract, chunk, FAISS
│   │   ├── db/
│   │   │   ├── database.py  # Async SQLAlchemy
│   │   │   └── models.py    # Document, ProviderConfig
│   │   ├── providers/
│   │   │   ├── base.py      # Abstract LLMProvider
│   │   │   ├── nvidia.py    # NVIDIA NIM (default)
│   │   │   ├── openai_provider.py
│   │   │   ├── anthropic_provider.py
│   │   │   ├── google_provider.py
│   │   │   └── router.py    # ProviderRouter with fallback
│   │   └── main.py          # FastAPI app factory
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/             # Next.js App Router pages
    │   │   ├── upload/      # Document upload
    │   │   ├── chat/        # AI chat + citations
    │   │   ├── documents/   # Document library
    │   │   └── settings/    # Provider configuration
    │   ├── components/
    │   │   ├── layout/      # Sidebar
    │   │   ├── upload/      # UploadArea
    │   │   ├── chat/        # ChatWindow, MessageBubble, CitationPanel
    │   │   ├── documents/   # DocumentLibrary
    │   │   ├── settings/    # SettingsPage, ProviderCard
    │   │   └── states/      # EmptyState, LoadingState, ErrorState
    │   └── lib/
    │       └── api.ts       # Typed API client
    └── .env.local
```

## Key Design Decisions

### Embedding Pinning
Each document stores which provider/model embedded it. When answering a question, 
DocAgent always uses the **same embedding provider** that indexed the document — 
never falls back to a different one. FAISS vectors from different models are not comparable.

### Provider Fallback (LLM only)
The `ProviderRouter` tries providers in priority order for **generation only**. 
On rate-limit/quota errors, it backs off that provider for 60 seconds and tries the next.

### Key Security
API keys are encrypted with Fernet (AES-128-CBC + HMAC). The decryption key 
(`SECRET_KEY`) is environment-only — never stored in the database alongside ciphertext.
