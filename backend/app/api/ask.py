from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.rag import search_faiss_index
from app.db.database import get_db
from app.db.models import Document
from app.providers.router import get_router

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ask", tags=["ask"])

RAG_SYSTEM_PROMPT = """You are DocAgent, an expert document analysis assistant.
Answer the user's question based ONLY on the provided document excerpts.
For each key claim, cite the source with [Doc: <filename>, Page <N>].
If the answer is not in the documents, say so clearly — do not hallucinate.
Be concise but thorough. Use markdown formatting for clarity."""


class AskRequest(BaseModel):
    question: str
    document_ids: list[int]
    top_k: int = 5


class Citation(BaseModel):
    text: str
    document_id: int
    filename: str
    page: int
    chunk_index: int
    score: float


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]
    provider_used: str
    model_used: str


@router.post("", response_model=AskResponse)
async def ask_question(
    request: AskRequest,
    db: AsyncSession = Depends(get_db),
) -> AskResponse:
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if not request.document_ids:
        raise HTTPException(status_code=400, detail="At least one document must be selected")

    provider_router = get_router()

    # ── Load documents ────────────────────────────────────────────────────
    stmt = select(Document).where(
        Document.id.in_(request.document_ids),
        Document.status == "ready",
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()

    if not docs:
        raise HTTPException(
            status_code=404,
            detail="No ready documents found with the provided IDs",
        )

    # ── Embed query — pinned to the provider used for each document ────────
    # Group documents by their embedding provider
    docs_by_provider: dict[str, list[Document]] = {}
    for doc in docs:
        docs_by_provider.setdefault(doc.embedding_provider, []).append(doc)

    all_citations: list[Citation] = []

    for provider_name, provider_docs in docs_by_provider.items():
        # Get the specific provider used to embed these documents
        embedding_provider = provider_router.get_provider_by_name(provider_name)
        if embedding_provider is None:
            logger.warning(
                "Embedding provider '%s' not configured — cannot search documents: %s",
                provider_name,
                [d.id for d in provider_docs],
            )
            continue

        # Embed the query with the pinned provider
        try:
            embed_result = await embedding_provider.embed([request.question])
            query_vector = embed_result.vectors[0]
        except Exception as exc:
            logger.error("Failed to embed query with %s: %s", provider_name, exc)
            raise HTTPException(
                status_code=503,
                detail=f"Embedding provider '{provider_name}' unavailable: {exc}",
            )

        # ── Search each document's FAISS index ─────────────────────────────
        for doc in provider_docs:
            try:
                hits = search_faiss_index(doc.faiss_index_path, query_vector, request.top_k)
                for hit in hits:
                    all_citations.append(Citation(
                        text=hit.text,
                        document_id=doc.id,
                        filename=doc.original_filename,
                        page=hit.page,
                        chunk_index=hit.chunk_index,
                        score=hit.score,
                    ))
            except Exception as exc:
                logger.error("FAISS search failed for doc %d: %s", doc.id, exc)

    if not all_citations:
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve relevant content from the documents",
        )

    # Sort by relevance score, take top-k overall
    all_citations.sort(key=lambda c: c.score, reverse=True)
    top_citations = all_citations[: request.top_k]

    # ── Build RAG prompt ──────────────────────────────────────────────────
    context_parts = []
    for c in top_citations:
        context_parts.append(
            f"[Doc: {c.filename}, Page {c.page}]\n{c.text}"
        )
    context = "\n\n---\n\n".join(context_parts)

    messages = [
        {"role": "system", "content": RAG_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Document excerpts:\n\n{context}\n\n---\n\nQuestion: {request.question}",
        },
    ]

    # ── Generate answer via ProviderRouter (with fallback) ─────────────────
    try:
        gen_result = await provider_router.generate(messages)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Generation failed: {exc}")

    return AskResponse(
        answer=gen_result.content,
        citations=top_citations,
        provider_used=gen_result.provider_used,
        model_used=gen_result.model_used,
    )
