from __future__ import annotations

import logging
from app.providers.base import (
    AuthError, EmbeddingResult, GenerationResult,
    LLMProvider, ProviderError, QuotaError, RateLimitError,
)

logger = logging.getLogger(__name__)

_DEFAULT_LLM_MODEL = "claude-3-5-haiku-20241022"
# Anthropic doesn't provide embeddings — use their LLM only
_EMBEDDING_DIM = 0


class AnthropicProvider(LLMProvider):
    provider_name = "anthropic"

    def __init__(self, api_key: str, llm_model: str = _DEFAULT_LLM_MODEL, **_):
        self._api_key = api_key
        self._llm_model = llm_model

    async def generate(self, messages, temperature=0.1, max_tokens=2048) -> GenerationResult:
        try:
            import anthropic

            system_content = next((m["content"] for m in messages if m["role"] == "system"), None)
            user_messages = [m for m in messages if m["role"] != "system"]

            client = anthropic.AsyncAnthropic(api_key=self._api_key)
            kwargs = dict(model=self._llm_model, max_tokens=max_tokens,
                          temperature=temperature, messages=user_messages)
            if system_content:
                kwargs["system"] = system_content

            response = await client.messages.create(**kwargs)
            return GenerationResult(
                content=response.content[0].text,
                provider_used=self.provider_name,
                model_used=self._llm_model,
                input_tokens=response.usage.input_tokens if response.usage else 0,
                output_tokens=response.usage.output_tokens if response.usage else 0,
            )
        except Exception as exc:
            self._raise_typed(exc)

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        raise ProviderError(
            "Anthropic does not provide an embedding API. "
            "Documents embedded with Anthropic are unsupported — use NVIDIA/OpenAI/Google for embeddings.",
            provider=self.provider_name,
        )

    async def health_check(self) -> bool:
        try:
            await self.generate([{"role": "user", "content": "Hi"}], max_tokens=5)
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
        return ""  # No embedding support

    def _raise_typed(self, exc: Exception) -> None:
        msg = str(exc).lower()
        provider = self.provider_name
        if "401" in msg or "authentication" in msg or "invalid" in msg:
            raise AuthError(f"Anthropic auth: {exc}", provider=provider) from exc
        if "429" in msg or "rate_limit" in msg or "overloaded" in msg:
            raise RateLimitError(f"Anthropic rate limited: {exc}", provider=provider) from exc
        if "quota" in msg or "billing" in msg:
            raise QuotaError(f"Anthropic quota: {exc}", provider=provider) from exc
        raise ProviderError(f"Anthropic error: {exc}", provider=provider) from exc
