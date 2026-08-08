from __future__ import annotations

import logging
from app.providers.base import (
    AuthError, EmbeddingResult, GenerationResult,
    LLMProvider, ProviderError, QuotaError, RateLimitError,
)

logger = logging.getLogger(__name__)

_DEFAULT_LLM_MODEL = "gpt-4o-mini"
_DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
_EMBEDDING_DIM = 1536


class OpenAIProvider(LLMProvider):
    provider_name = "openai"

    def __init__(self, api_key: str, llm_model: str = _DEFAULT_LLM_MODEL,
                 embedding_model: str = _DEFAULT_EMBEDDING_MODEL):
        self._api_key = api_key
        self._llm_model = llm_model
        self._embedding_model = embedding_model

    async def generate(self, messages, temperature=0.1, max_tokens=2048) -> GenerationResult:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self._api_key)
            response = await client.chat.completions.create(
                model=self._llm_model, messages=messages,
                temperature=temperature, max_tokens=max_tokens,
            )
            return GenerationResult(
                content=response.choices[0].message.content,
                provider_used=self.provider_name,
                model_used=self._llm_model,
                input_tokens=response.usage.prompt_tokens if response.usage else 0,
                output_tokens=response.usage.completion_tokens if response.usage else 0,
            )
        except Exception as exc:
            self._raise_typed(exc)

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self._api_key)
            response = await client.embeddings.create(model=self._embedding_model, input=texts)
            vectors = [d.embedding for d in response.data]
            return EmbeddingResult(vectors=vectors, provider_used=self.provider_name,
                                   model_used=self._embedding_model, dim=len(vectors[0]))
        except Exception as exc:
            self._raise_typed(exc)

    async def health_check(self) -> bool:
        try:
            await self.embed(["ping"])
            return True
        except Exception:
            return False

    @property
    def embedding_dim(self) -> int:
        return _EMBEDDING_DIM

    @property
    def default_llm_model(self) -> str:
        return _DEFAULT_LLM_MODEL

    @property
    def default_embedding_model(self) -> str:
        return _DEFAULT_EMBEDDING_MODEL

    def _raise_typed(self, exc: Exception) -> None:
        msg = str(exc).lower()
        provider = self.provider_name
        if "401" in msg or "invalid" in msg or "incorrect api key" in msg:
            raise AuthError(f"OpenAI auth: {exc}", provider=provider) from exc
        if "429" in msg or "rate limit" in msg:
            raise RateLimitError(f"OpenAI rate limited: {exc}", provider=provider) from exc
        if "quota" in msg or "billing" in msg:
            raise QuotaError(f"OpenAI quota: {exc}", provider=provider) from exc
        raise ProviderError(f"OpenAI error: {exc}", provider=provider) from exc
