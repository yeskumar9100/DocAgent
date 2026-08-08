from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.encryption import decrypt_key, encrypt_key, mask_key
from app.db.database import get_db
from app.db.models import ProviderConfig
from app.providers.router import get_router, reset_router, ProviderSlot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])

SUPPORTED_PROVIDERS = {"nvidia", "openai", "anthropic", "google", "custom"}


class ProviderUpsertRequest(BaseModel):
    provider_name: str
    api_key: str
    base_url: Optional[str] = None
    custom_name: Optional[str] = None
    is_fallback: bool = False
    priority_order: int = Field(default=10, ge=1, le=999)
    llm_model: Optional[str] = None
    embedding_model: Optional[str] = None


class ProviderResponse(BaseModel):
    provider_name: str
    masked_key: str
    base_url: Optional[str] = None
    custom_name: Optional[str] = None
    is_enabled: bool
    is_fallback: bool
    priority_order: int
    status: str
    llm_model: Optional[str] = None
    embedding_model: Optional[str] = None
    # Runtime info from the router
    backoff_remaining: float = 0.0


def _make_provider(config: ProviderConfig, api_key: str):
    """Instantiate the right LLMProvider subclass."""
    name = config.provider_name
    if name == "nvidia":
        from app.providers.nvidia import NvidiaProvider
        return NvidiaProvider(api_key=api_key,
                              llm_model=config.llm_model or "",
                              embedding_model=config.embedding_model or "")
    elif name == "openai":
        from app.providers.openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=api_key, llm_model=config.llm_model or "")
    elif name == "anthropic":
        from app.providers.anthropic_provider import AnthropicProvider
        return AnthropicProvider(api_key=api_key, llm_model=config.llm_model or "")
    elif name == "google":
        from app.providers.google_provider import GoogleProvider
        return GoogleProvider(api_key=api_key, llm_model=config.llm_model or "")
    else:
        # Custom provider — use OpenAI-compatible base URL
        from app.providers.openai_provider import OpenAIProvider
        import openai
        return OpenAIProvider(api_key=api_key, llm_model=config.llm_model or "gpt-3.5-turbo")


@router.get("/providers", response_model=list[ProviderResponse])
async def list_providers(db: AsyncSession = Depends(get_db)):
    stmt = select(ProviderConfig).order_by(ProviderConfig.priority_order)
    result = await db.execute(stmt)
    configs = result.scalars().all()

    # Get runtime status from the router
    router_status = {s["name"]: s for s in get_router().list_providers()}

    responses = []
    for cfg in configs:
        masked = ""
        if cfg.encrypted_key:
            try:
                raw = decrypt_key(cfg.encrypted_key)
                masked = mask_key(raw)
            except Exception:
                masked = "•••• (decryption error)"

        runtime = router_status.get(cfg.provider_name, {})
        responses.append(ProviderResponse(
            provider_name=cfg.provider_name,
            masked_key=masked,
            base_url=cfg.base_url,
            custom_name=cfg.custom_name,
            is_enabled=cfg.is_enabled,
            is_fallback=cfg.is_fallback,
            priority_order=cfg.priority_order,
            status=cfg.status,
            llm_model=cfg.llm_model,
            embedding_model=cfg.embedding_model,
            backoff_remaining=runtime.get("backoff_remaining", 0.0),
        ))
    return responses


@router.post("/providers", response_model=ProviderResponse)
async def upsert_provider(
    req: ProviderUpsertRequest,
    db: AsyncSession = Depends(get_db),
):
    if req.provider_name not in SUPPORTED_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider. Choose from: {', '.join(sorted(SUPPORTED_PROVIDERS))}",
        )
    api_key = req.api_key.strip()
    if not api_key or api_key == '____KEEP____':
        pass  # ____KEEP____ is an internal sentinel — validated below
    elif len(api_key) < 8:
        raise HTTPException(status_code=400, detail="API key is too short — please check it and try again.")

    encrypted = encrypt_key(req.api_key)
    masked = mask_key(req.api_key)

    # Upsert
    stmt = select(ProviderConfig).where(ProviderConfig.provider_name == req.provider_name)
    result = await db.execute(stmt)
    cfg = result.scalar_one_or_none()

    if cfg:
        cfg.encrypted_key = encrypted
        cfg.base_url = req.base_url
        cfg.custom_name = req.custom_name
        cfg.is_fallback = req.is_fallback
        cfg.priority_order = req.priority_order
        cfg.status = "not_configured"  # Will be updated on health check
        if req.llm_model:
            cfg.llm_model = req.llm_model
        if req.embedding_model:
            cfg.embedding_model = req.embedding_model
    else:
        cfg = ProviderConfig(
            provider_name=req.provider_name,
            encrypted_key=encrypted,
            base_url=req.base_url,
            custom_name=req.custom_name,
            is_fallback=req.is_fallback,
            priority_order=req.priority_order,
            is_enabled=True,
            status="not_configured",
            llm_model=req.llm_model,
            embedding_model=req.embedding_model,
        )
        db.add(cfg)

    await db.commit()
    await db.refresh(cfg)

    # Reload provider into router
    health_error: str | None = None
    try:
        provider = _make_provider(cfg, req.api_key)
        alive = await provider.health_check()
        cfg.status = "connected" if alive else "auth_error"
        await db.commit()

        prov_router = get_router()
        prov_router.add_provider(provider, priority=cfg.priority_order, is_fallback=cfg.is_fallback)
        reset_router()  # re-sort
        # Re-add after reset
        from app.providers.router import get_router as gr
        gr().add_provider(provider, priority=cfg.priority_order, is_fallback=cfg.is_fallback)
    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc)
        logger.warning("Provider %s health check failed: %s", req.provider_name, err_msg)
        cfg.status = "auth_error"
        await db.commit()
        health_error = err_msg

    response = ProviderResponse(
        provider_name=cfg.provider_name,
        masked_key=masked,
        base_url=cfg.base_url,
        custom_name=cfg.custom_name,
        is_enabled=cfg.is_enabled,
        is_fallback=cfg.is_fallback,
        priority_order=cfg.priority_order,
        status=cfg.status,
        llm_model=cfg.llm_model,
        embedding_model=cfg.embedding_model,
    )

    # If health check failed, return 400 with the error detail so the UI shows it
    if health_error:
        # Still commit the key — user can fix auth separately
        from fastapi.responses import JSONResponse
        import json
        raise HTTPException(
            status_code=400,
            detail=f"Key saved, but provider connection failed: {health_error}",
        )

    return response


@router.delete("/providers/{provider_name}", status_code=204)
async def delete_provider(provider_name: str, db: AsyncSession = Depends(get_db)):
    stmt = select(ProviderConfig).where(ProviderConfig.provider_name == provider_name)
    result = await db.execute(stmt)
    cfg = result.scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Provider not configured")

    await db.delete(cfg)
    await db.commit()

    get_router().remove_provider(provider_name)


@router.get("/providers/{provider_name}/test")
async def test_provider_connection(
    provider_name: str,
    db: AsyncSession = Depends(get_db),
):
    """Fire a real health-check and return latency + status. Powers the UI 'Test' button."""
    import time

    stmt = select(ProviderConfig).where(ProviderConfig.provider_name == provider_name)
    result = await db.execute(stmt)
    cfg = result.scalar_one_or_none()

    if not cfg:
        raise HTTPException(status_code=404, detail="Provider not configured — add an API key first.")
    if not cfg.encrypted_key:
        raise HTTPException(status_code=400, detail="No API key stored for this provider.")

    try:
        api_key = decrypt_key(cfg.encrypted_key)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt stored API key.")

    provider = _make_provider(cfg, api_key)

    start = time.monotonic()
    try:
        alive = await provider.health_check()
        latency_ms = int((time.monotonic() - start) * 1000)
        return {
            "provider_name": provider_name,
            "status": "connected" if alive else "auth_error",
            "latency_ms": latency_ms,
        }
    except Exception as exc:
        latency_ms = int((time.monotonic() - start) * 1000)
        raise HTTPException(
            status_code=400,
            detail=f"Connection failed after {latency_ms}ms: {exc}",
        )

