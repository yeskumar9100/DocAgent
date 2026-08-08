"""
RAG (Retrieval-Augmented Generation) utilities.
Handles text extraction, chunking, embedding, and FAISS index management.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import NamedTuple

import faiss
import numpy as np

logger = logging.getLogger(__name__)

# ── Text extraction ───────────────────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> list[str]:
    """Extract text page by page from a PDF."""
    from pypdf import PdfReader
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text.strip())
    return pages


def extract_text_from_txt(file_path: str) -> list[str]:
    """Read a plain text file as a single page."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        return [f.read()]


def extract_text_from_docx(file_path: str) -> list[str]:
    """Extract text from a DOCX file paragraph by paragraph."""
    from docx import Document
    doc = Document(file_path)
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [full_text] if full_text else []


def extract_text(file_path: str, mime_type: str) -> list[str]:
    """Route to the appropriate extractor."""
    if "pdf" in mime_type or file_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    if "word" in mime_type or file_path.endswith(".docx"):
        return extract_text_from_docx(file_path)
    return extract_text_from_txt(file_path)


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(pages: list[str], chunk_size: int = 800, overlap: int = 100) -> list[dict]:
    """
    Split pages into overlapping chunks. Returns list of:
    {"text": str, "page": int, "chunk_index": int}
    """
    chunks = []
    chunk_index = 0
    for page_num, page_text in enumerate(pages):
        words = page_text.split()
        i = 0
        while i < len(words):
            chunk_words = words[i : i + chunk_size]
            chunk_text_str = " ".join(chunk_words)
            if chunk_text_str.strip():
                chunks.append({
                    "text": chunk_text_str,
                    "page": page_num + 1,
                    "chunk_index": chunk_index,
                })
                chunk_index += 1
            i += chunk_size - overlap
    return chunks


# ── FAISS index ───────────────────────────────────────────────────────────────

class SearchResult(NamedTuple):
    text: str
    page: int
    chunk_index: int
    score: float


def build_faiss_index(
    vectors: list[list[float]],
    chunks: list[dict],
    index_dir: Path,
    doc_id: int,
) -> str:
    """
    Build a flat L2 FAISS index and save it to disk.
    Returns the path to the saved index directory.
    """
    doc_index_dir = index_dir / f"doc_{doc_id}"
    doc_index_dir.mkdir(parents=True, exist_ok=True)

    dim = len(vectors[0])
    matrix = np.array(vectors, dtype=np.float32)
    faiss.normalize_L2(matrix)  # Normalize for cosine similarity

    index = faiss.IndexFlatIP(dim)  # Inner product (cosine after normalization)
    index.add(matrix)

    faiss.write_index(index, str(doc_index_dir / "index.faiss"))

    # Save chunk metadata alongside the index
    with open(doc_index_dir / "chunks.json", "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False)

    logger.info("Built FAISS index for doc %d: %d vectors, dim=%d", doc_id, len(vectors), dim)
    return str(doc_index_dir)


def search_faiss_index(
    index_path: str,
    query_vector: list[float],
    top_k: int = 5,
) -> list[SearchResult]:
    """Load a FAISS index and return top-k most similar chunks."""
    index_dir = Path(index_path)
    index = faiss.read_index(str(index_dir / "index.faiss"))

    with open(index_dir / "chunks.json", "r", encoding="utf-8") as f:
        chunks = json.load(f)

    query = np.array([query_vector], dtype=np.float32)
    faiss.normalize_L2(query)

    scores, indices = index.search(query, min(top_k, len(chunks)))

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx >= 0 and idx < len(chunks):
            chunk = chunks[idx]
            results.append(SearchResult(
                text=chunk["text"],
                page=chunk["page"],
                chunk_index=chunk["chunk_index"],
                score=float(score),
            ))
    return results


def delete_faiss_index(index_path: str) -> None:
    """Remove a FAISS index directory from disk."""
    import shutil
    if os.path.exists(index_path):
        shutil.rmtree(index_path)
        logger.info("Deleted FAISS index: %s", index_path)
