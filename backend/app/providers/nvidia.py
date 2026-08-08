from __future__ import annotations

import logging
from typing import Any

from app.providers.base import (
    AuthError,
    EmbeddingResult,
    GenerationResult,
    LLMProvider,
    ProviderError,
    QuotaError,
    RateLimitError,
)

logger = logging.getLogger(__name__)

# Default models — change these if NVIDIA updates their catalog
_DEFAULT_LLM_MODEL = "meta/llama-3.1-70b-instruct"
_DEFAULT_EMBEDDING_MODEL = "nvidia/llama-3.2-nv-embedqa-1b-v2"
_EMBEDDING_DIM = 2048  # nvidia/llama-3.2-nv-embedqa-1b-v2 output dim


class NvidiaProvider(LLMProvider):
    """
    NVIDIA NIM / build.nvidia.com provider.
    Uses langchain-nvidia-ai-endpoints under the hood.
    """

    provider_name = "nvidia"

    def __init__(
        self,
        api_key: str,
        llm_model: str = _DEFAULT_LLM_MODEL,
        embedding_model: str = _DEFAULT_EMBEDDING_MODEL,
    ):
        self._api_key = api_key
        self._llm_model = llm_model
        self._embedding_model = embedding_model

    # ── LLM ──────────────────────────────────────────────────────────────────

    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> GenerationResult:
        try:
            from langchain_nvidia_ai_endpoints import ChatNVIDIA
            from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

            lc_messages = []
            for m in messages:
                role, content = m["role"], m["content"]
                if role == "system":
                    lc_messages.append(SystemMessage(content=content))
                elif role == "user":
                    lc_messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    lc_messages.append(AIMessage(content=content))

            client = ChatNVIDIA(
                model=self._llm_model,
                api_key=self._api_key,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            response = await client.ainvoke(lc_messages)
            return GenerationResult(
                content=response.content,
                provider_used=self.provider_name,
                model_used=self._llm_model,
            )

        except Exception as exc:
            self._raise_typed(exc)

    # ── Embeddings ────────────────────────────────────────────────────────────

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        try:
            from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings

            client = NVIDIAEmbeddings(
                model=self._embedding_model,
                api_key=self._api_key,
                truncate="END",
            )
            vectors = await client.aembed_documents(texts)
            return EmbeddingResult(
                vectors=vectors,
                provider_used=self.provider_name,
                model_used=self._embedding_model,
                dim=len(vectors[0]) if vectors else _EMBEDDING_DIM,
            )

        except Exception as exc:
            self._raise_typed(exc)

    # ── Health check ──────────────────────────────────────────────────────────

    async def health_check(self) -> bool:
        try:
            result = await self.embed(["health check"])
            return len(result.vectors) > 0
        except Exception:
            return False

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def embedding_dim(self) -> int:
        return _EMBEDDING_DIM

    @property
    def default_llm_model(self) -> str:
        return _DEFAULT_LLM_MODEL

    @property
    def default_embedding_model(self) -> str:
        return _DEFAULT_EMBEDDING_MODEL

    # ── Error translation ─────────────────────────────────────────────────────

    def _raise_typed(self, exc: Exception) -> None:
        msg = str(exc).lower()
        provider = self.provider_name
        if "401" in msg or "unauthorized" in msg or "invalid api key" in msg:
            raise AuthError(f"NVIDIA auth error: {exc}", provider=provider) from exc
        if "429" in msg or "rate limit" in msg or "too many requests" in msg:
            raise RateLimitError(f"NVIDIA rate limited: {exc}", provider=provider) from exc
        if "quota" in msg or "billing" in msg:
            raise QuotaError(f"NVIDIA quota exceeded: {exc}", provider=provider) from exc
        raise ProviderError(f"NVIDIA error: {exc}", provider=provider) from exc
