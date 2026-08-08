from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class GenerationResult:
    content: str
    provider_used: str
    model_used: str
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class EmbeddingResult:
    vectors: list[list[float]]
    provider_used: str
    model_used: str
    dim: int


class LLMProvider(ABC):
    """
    Abstract base for all LLM/embedding providers.
    
    EMBEDDING PINNING NOTE:
    embed() should only be called with the provider that originally embedded
    the document. Never fall back to a different provider for embeddings —
    FAISS vectors from different models are not comparable.
    """

    provider_name: str  # e.g. "nvidia", "openai"

    @abstractmethod
    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> GenerationResult:
        """Generate a chat completion. May raise ProviderError on failure."""
        ...

    @abstractmethod
    async def embed(self, texts: list[str]) -> EmbeddingResult:
        """
        Embed a list of texts.
        Should NOT be used as a fallback target — embeddings must stay pinned.
        """
        ...

    @property
    @abstractmethod
    def embedding_dim(self) -> int:
        """Dimension of the embedding vectors produced by this provider."""
        ...

    @property
    @abstractmethod
    def default_llm_model(self) -> str:
        """Default model name for generation."""
        ...

    @property
    @abstractmethod
    def default_embedding_model(self) -> str:
        """Default model name for embeddings."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the provider is reachable and the key is valid."""
        ...


class ProviderError(Exception):
    """Base exception for provider errors."""
    provider: str

    def __init__(self, message: str, provider: str = "unknown"):
        super().__init__(message)
        self.provider = provider


class RateLimitError(ProviderError):
    """Provider returned a 429 / rate-limited response."""
    pass


class AuthError(ProviderError):
    """Provider returned 401/403 — invalid or expired API key."""
    pass


class QuotaError(ProviderError):
    """Provider quota exceeded."""
    pass


class ProviderUnavailableError(ProviderError):
    """Provider is temporarily down or unreachable."""
    pass
