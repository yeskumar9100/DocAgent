from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

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

# How long (seconds) to mark a provider unavailable after a rate-limit/quota error
_BACKOFF_SECONDS = 60


@dataclass
class ProviderSlot:
    provider: LLMProvider
    priority: int
    is_fallback: bool = False
    # Temporary unavailability tracking (in-memory only, resets on restart)
    unavailable_until: float = 0.0
    last_error: str = ""

    @property
    def is_available(self) -> bool:
        return time.monotonic() >= self.unavailable_until

    def mark_unavailable(self, reason: str, duration: float = _BACKOFF_SECONDS) -> None:
        self.unavailable_until = time.monotonic() + duration
        self.last_error = reason
        logger.warning(
            "Provider %s marked unavailable for %.0fs: %s",
            self.provider.provider_name, duration, reason,
        )

    def mark_available(self) -> None:
        self.unavailable_until = 0.0
        self.last_error = ""


class ProviderRouter:
    """
    Routes LLM generation requests across multiple providers with automatic
    fallback on rate-limit / quota / auth errors.

    EMBEDDING SAFETY:
    This router does NOT fall back for embeddings. When embed() is called,
    it must be called with the specific provider that originally indexed
    the document. The router exposes get_provider_by_name() for this purpose.

    Fallback is ONLY applied to generate() calls.
    """

    def __init__(self, slots: list[ProviderSlot] | None = None):
        self._slots: list[ProviderSlot] = sorted(
            slots or [], key=lambda s: s.priority
        )

    def add_provider(self, provider: LLMProvider, priority: int = 999,
                     is_fallback: bool = False) -> None:
        # Remove existing slot with same name first
        self._slots = [s for s in self._slots if s.provider.provider_name != provider.provider_name]
        self._slots.append(ProviderSlot(provider=provider, priority=priority, is_fallback=is_fallback))
        self._slots.sort(key=lambda s: s.priority)

    def remove_provider(self, provider_name: str) -> None:
        self._slots = [s for s in self._slots if s.provider.provider_name != provider_name]

    def get_provider_by_name(self, name: str) -> Optional[LLMProvider]:
        """Get a specific provider by name — used for pinned embedding calls."""
        for slot in self._slots:
            if slot.provider.provider_name == name:
                return slot.provider
        return None

    @property
    def primary_embedding_provider(self) -> Optional[LLMProvider]:
        """The highest-priority provider that supports embeddings."""
        for slot in self._slots:
            if slot.is_available and slot.provider.embedding_dim > 0:
                return slot.provider
        return None

    def list_providers(self) -> list[dict]:
        """Return provider status list for the /settings/providers endpoint."""
        now = time.monotonic()
        return [
            {
                "name": s.provider.provider_name,
                "priority": s.priority,
                "is_fallback": s.is_fallback,
                "available": s.is_available,
                "backoff_remaining": max(0, s.unavailable_until - now),
                "last_error": s.last_error,
            }
            for s in self._slots
        ]

    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 2048,
    ) -> GenerationResult:
        """
        Try providers in priority order. Falls back on rate-limit/quota/auth errors.
        Raises ProviderError only if ALL configured providers fail.
        """
        if not self._slots:
            raise ProviderError("No providers configured. Add an API key in Settings.")

        errors: list[str] = []
        tried: list[str] = []

        for slot in self._slots:
            if not slot.is_available:
                logger.info(
                    "Skipping %s — backing off for %.0fs",
                    slot.provider.provider_name,
                    slot.unavailable_until - time.monotonic(),
                )
                continue

            tried.append(slot.provider.provider_name)
            try:
                result = await slot.provider.generate(messages, temperature, max_tokens)
                slot.mark_available()  # success — clear any previous error
                logger.info("Generation succeeded via %s", slot.provider.provider_name)
                return result

            except (RateLimitError, QuotaError) as exc:
                slot.mark_unavailable(str(exc), duration=_BACKOFF_SECONDS)
                errors.append(f"{slot.provider.provider_name}: {exc}")
                logger.warning("Falling back from %s: %s", slot.provider.provider_name, exc)

            except AuthError as exc:
                # Auth errors are permanent — mark for longer
                slot.mark_unavailable(str(exc), duration=3600)
                errors.append(f"{slot.provider.provider_name}: auth error")
                logger.error("Auth error for %s: %s", slot.provider.provider_name, exc)

            except ProviderError as exc:
                slot.mark_unavailable(str(exc), duration=30)
                errors.append(f"{slot.provider.provider_name}: {exc}")
                logger.warning("Provider error for %s: %s", slot.provider.provider_name, exc)

        raise ProviderError(
            f"All providers failed. Tried: {tried}. Errors: {'; '.join(errors)}"
        )


# ── Global singleton router ───────────────────────────────────────────────────
# Populated at startup by loading provider configs from the database.
_router: ProviderRouter | None = None


def get_router() -> ProviderRouter:
    global _router
    if _router is None:
        _router = ProviderRouter()
    return _router


def reset_router() -> None:
    """Force re-initialization (call after adding/removing providers)."""
    global _router
    _router = None
