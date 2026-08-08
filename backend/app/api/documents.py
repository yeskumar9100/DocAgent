from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.rag import delete_faiss_index
from app.db.database import get_db
from app.db.models import Document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentResponse(BaseModel):
    id: int
    original_filename: str
    file_size: int
    chunk_count: int
    embedding_provider: str
    embedding_model: str
    status: str
    error_message: Optional[str] = None
    created_at: str


@router.get("", response_model=list[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_db)):
    stmt = select(Document).order_by(Document.created_at.desc())
    result = await db.execute(stmt)
    docs = result.scalars().all()
    return [
        DocumentResponse(
            id=d.id,
            original_filename=d.original_filename,
            file_size=d.file_size,
            chunk_count=d.chunk_count,
            embedding_provider=d.embedding_provider,
            embedding_model=d.embedding_model,
            status=d.status,
            error_message=d.error_message,
            created_at=d.created_at.isoformat() if d.created_at else "",
        )
        for d in docs
    ]


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete FAISS index from disk
    if doc.faiss_index_path:
        try:
            delete_faiss_index(doc.faiss_index_path)
        except Exception as exc:
            logger.warning("Could not delete FAISS index for doc %d: %s", doc_id, exc)

    # Delete the uploaded file
    import os
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as exc:
            logger.warning("Could not delete file for doc %d: %s", doc_id, exc)

    await db.delete(doc)
    await db.commit()


@router.get("/{doc_id}/pages", response_model=list[int])
async def get_document_pages(doc_id: int, db: AsyncSession = Depends(get_db)):
    """Return the sorted list of actual page numbers indexed for this document."""
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    import json
    from pathlib import Path
    if not doc.faiss_index_path:
        return [1]

    chunks_path = Path(doc.faiss_index_path) / "chunks.json"
    if not chunks_path.exists():
        return [1]

    try:
        with open(chunks_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
        pages = sorted(list(set(chunk["page"] for chunk in chunks if "page" in chunk)))
        return pages or [1]
    except Exception as exc:
        logger.warning("Could not read pages for doc %d: %s", doc_id, exc)
        return [1]


