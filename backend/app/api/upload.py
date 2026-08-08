from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.core.rag import build_faiss_index, chunk_text, extract_text
from app.db.database import get_db
from app.db.models import Document
from app.providers.router import get_router

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


class UploadResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    chunk_count: int
    embedding_provider: str
    embedding_model: str
    status: str


@router.post("", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    settings = get_settings()
    provider_router = get_router()

    # ── Validate file ──────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_TYPES and not (
        file.filename or "").endswith((".pdf", ".txt", ".docx")):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Supported: PDF, TXT, DOCX",
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f}MB. Max: {settings.max_file_size_mb}MB",
        )

    # ── Get embedding provider ─────────────────────────────────────────────
    embedding_provider = provider_router.primary_embedding_provider
    if embedding_provider is None:
        raise HTTPException(
            status_code=503,
            detail="No embedding provider configured. Add an API key in Settings.",
        )

    # ── Save file to disk ──────────────────────────────────────────────────
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = settings.upload_path / safe_name
    with open(file_path, "wb") as f:
        f.write(content)

    # ── Create DB record (status=processing) ───────────────────────────────
    mime = file.content_type or "text/plain"
    doc = Document(
        filename=safe_name,
        original_filename=file.filename or "upload",
        file_path=str(file_path),
        file_size=len(content),
        mime_type=mime,
        embedding_provider=embedding_provider.provider_name,
        embedding_model=embedding_provider.default_embedding_model,
        embedding_dim=embedding_provider.embedding_dim,
        faiss_index_path="",
        chunk_count=0,
        status="processing",
    )
    db.add(doc)
    await db.flush()  # Get doc.id before committing
    await db.refresh(doc)
    doc_id = doc.id

    try:
        # ── Extract + chunk ────────────────────────────────────────────────
        pages = extract_text(str(file_path), mime)
        if not pages or not any(p.strip() for p in pages):
            raise ValueError("Could not extract any text from the document")

        chunks = chunk_text(pages)
        if not chunks:
            raise ValueError("No text chunks produced from the document")

        # ── Embed ──────────────────────────────────────────────────────────
        texts = [c["text"] for c in chunks]
        # Batch in groups of 50 to avoid API limits
        all_vectors = []
        batch_size = 50
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            result = await embedding_provider.embed(batch)
            all_vectors.extend(result.vectors)

        # ── Build FAISS index ──────────────────────────────────────────────
        index_path = build_faiss_index(
            all_vectors, chunks, settings.faiss_index_path, doc_id
        )

        # ── Update DB record ───────────────────────────────────────────────
        doc.faiss_index_path = index_path
        doc.chunk_count = len(chunks)
        doc.status = "ready"
        await db.commit()

        logger.info("Document %d uploaded and indexed: %d chunks", doc_id, len(chunks))
        return UploadResponse(
            id=doc_id,
            filename=safe_name,
            original_filename=file.filename or "upload",
            file_size=len(content),
            chunk_count=len(chunks),
            embedding_provider=embedding_provider.provider_name,
            embedding_model=embedding_provider.default_embedding_model,
            status="ready",
        )

    except Exception as exc:
        logger.exception("Failed to process document %d: %s", doc_id, exc)
        doc.status = "error"
        doc.error_message = str(exc)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")
