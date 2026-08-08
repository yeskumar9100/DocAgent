from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    Float,
    func,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Document(Base):
    """Represents an uploaded document and its FAISS index metadata."""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(512), nullable=False)
    original_filename = Column(String(512), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    mime_type = Column(String(128), nullable=True)

    # Embedding metadata — CRITICAL: pinned per document
    # Never fall back to a different embedding provider mid-session
    embedding_provider = Column(String(64), nullable=False)  # e.g. "nvidia"
    embedding_model = Column(String(128), nullable=False)    # e.g. "nvidia/llama-3.2-nv-embedqa-1b-v2"
    embedding_dim = Column(Integer, nullable=False)          # e.g. 1024

    # FAISS index storage
    faiss_index_path = Column(String(1024), nullable=False)
    chunk_count = Column(Integer, nullable=False, default=0)

    # Status
    status = Column(String(32), nullable=False, default="processing")  # processing | ready | error
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ProviderConfig(Base):
    """
    Stores encrypted API keys for AI providers.
    The encrypted_key column contains Fernet ciphertext only.
    The decryption key (SECRET_KEY) lives exclusively in .env.
    """
    __tablename__ = "provider_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider_name = Column(String(64), nullable=False, unique=True)  # nvidia | openai | anthropic | google | custom

    # Encrypted with Fernet — SECRET_KEY from environment, never stored here
    encrypted_key = Column(Text, nullable=True)

    # For custom providers
    base_url = Column(String(512), nullable=True)
    custom_name = Column(String(128), nullable=True)  # Display name for custom provider

    # Provider behavior
    is_enabled = Column(Boolean, nullable=False, default=True)
    is_fallback = Column(Boolean, nullable=False, default=False)
    priority_order = Column(Integer, nullable=False, default=999)  # lower = higher priority

    # Runtime status (updated dynamically, not persisted across restarts)
    status = Column(String(32), nullable=False, default="not_configured")
    # Status values: not_configured | connected | rate_limited | auth_error | error

    # Which model to use for generation and embeddings
    llm_model = Column(String(128), nullable=True)
    embedding_model = Column(String(128), nullable=True)

    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ChatSession(Base):
    """Optional: groups messages into a session for history."""
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256), nullable=True)
    document_ids = Column(Text, nullable=True)  # JSON array of document IDs
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
