from __future__ import annotations

import logging
from app.providers.base import (
    AuthError, EmbeddingResult, GenerationResult,
    LLMProvider, ProviderError, QuotaError, RateLimitError,
)

logger = logging.getLogger(__name__)

_DEFAULT_LLM_MODEL = "gemini-2.0-flash-exp"
_DEFAULT_EMBEDDING_MODEL = "models/text-embedding-004"
_EMBEDDING_DIM = 768


class GoogleProvider(LLMProvider):
    provider_name = "google"

    def __init__(self, api_key: str, llm_model: str = _DEFAULT_LLM_MODEL,
                 embedding_model: str = _DEFAULT_EMBEDDING_MODEL):
        self._api_key = api_key
        self._llm_model = llm_model
        self._embedding_model = embedding_model

    async def generate(self, messages, temperature=0.1, max_tokens=2048) -> GenerationResult:
        try:
            import google.generativeai as genai
            import asyncio

            genai.configure(api_key=self._api_key)
            model = genai.GenerativeModel(self._llm_model)

            # Convert messages format
            system_parts = [m["content"] for m in messages if m["role"] == "system"]
            history = []
            last_user = None
            for m in messages:
                if m["role"] == "user":
                    last_user = m["content"]
                elif m["role"] == "assistant":
                    history.append({"role": "model", "parts": [m["content"]]})

            prompt = "\n".join(system_parts + ([last_user] if last_user else []))

            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature,
                        max_output_tokens=max_tokens,
                    )
                )
            )
            return GenerationResult(
                content=response.text,
                provider_used=self.provider_name,
                model_used=self._llm_model,
            )
        except Exception as exc:
            self._raise_typed(exc)

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        try:
            import google.generativeai as genai
            import asyncio

            genai.configure(api_key=self._api_key)

            async def _embed_all():
                results = []
                for text in texts:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda t=text: genai.embed_content(
                            model=self._embedding_model,
                            content=t,
                            task_type="retrieval_document",
                        )
                    )
                    results.append(result["embedding"])
                return results

            vectors = await _embed_all()
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
        if "401" in msg or "api_key" in msg or "invalid" in msg or "permission" in msg:
            raise AuthError(f"Google auth: {exc}", provider=provider) from exc
        if "429" in msg or "quota" in msg or "resource_exhausted" in msg:
            raise RateLimitError(f"Google rate limited: {exc}", provider=provider) from exc
        raise ProviderError(f"Google error: {exc}", provider=provider) from exc
