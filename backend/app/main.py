from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import init_db, get_session_factory
from app.db.models import ProviderConfig
from app.providers.router import get_router, ProviderSlot
from app.api import upload, ask, documents, settings as settings_router

logger = logging.getLogger(__name__)

# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app_settings = get_settings()

    app = FastAPI(
        title="DocAgent API",
        description="AI-powered document assistant with multi-provider RAG",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(upload.router)
    app.include_router(ask.router)
    app.include_router(documents.router)
    app.include_router(settings_router.router)

    @app.get("/health", tags=["health"])
    async def health():
        """Health check endpoint for uptime monitoring and deployment validation."""
        router = get_router()
        providers = router.list_providers()
        connected = [p for p in providers if p["available"]]
        return {
            "status": "ok",
            "version": "1.0.0",
            "providers_configured": len(providers),
            "providers_available": len(connected),
        }

    @app.on_event("startup")
    async def startup():
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s — %(message)s",
        )
        logger.info("Starting DocAgent API...")

        # Create DB tables
        await init_db()
        logger.info("Database initialized")

        # Load providers from DB into the router
        await _load_providers_from_db()

        # Load NVIDIA key from environment as default if not in DB
        await _seed_nvidia_from_env(app_settings)

        logger.info("DocAgent API ready ✓")

    return app


async def _load_providers_from_db():
    """Re-populate the ProviderRouter from persisted DB configs on startup."""
    from sqlalchemy import select
    from app.core.encryption import decrypt_key
    from app.providers.nvidia import NvidiaProvider
    from app.providers.openai_provider import OpenAIProvider
    from app.providers.anthropic_provider import AnthropicProvider
    from app.providers.google_provider import GoogleProvider

    factory = get_session_factory()
    async with factory() as session:
        stmt = select(ProviderConfig).where(ProviderConfig.is_enabled == True).order_by(
            ProviderConfig.priority_order
        )
        result = await session.execute(stmt)
        configs = result.scalars().all()

    router = get_router()
    for cfg in configs:
        if not cfg.encrypted_key:
            continue
        try:
            api_key = decrypt_key(cfg.encrypted_key)
        except Exception as exc:
            logger.warning("Could not decrypt key for %s: %s", cfg.provider_name, exc)
            continue

        try:
            if cfg.provider_name == "nvidia":
                provider = NvidiaProvider(api_key=api_key,
                                          llm_model=cfg.llm_model or "",
                                          embedding_model=cfg.embedding_model or "")
            elif cfg.provider_name == "openai":
                provider = OpenAIProvider(api_key=api_key, llm_model=cfg.llm_model or "")
            elif cfg.provider_name == "anthropic":
                provider = AnthropicProvider(api_key=api_key, llm_model=cfg.llm_model or "")
            elif cfg.provider_name == "google":
                provider = GoogleProvider(api_key=api_key, llm_model=cfg.llm_model or "")
            else:
                provider = OpenAIProvider(api_key=api_key, llm_model=cfg.llm_model or "gpt-3.5-turbo")

            router.add_provider(provider, priority=cfg.priority_order, is_fallback=cfg.is_fallback)
            logger.info("Loaded provider: %s (priority=%d)", cfg.provider_name, cfg.priority_order)
        except Exception as exc:
            logger.warning("Failed to load provider %s: %s", cfg.provider_name, exc)


async def _seed_nvidia_from_env(app_settings):
    """
    If NVIDIA_API_KEY is in .env and no nvidia config exists in DB,
    auto-register it as the default provider so the app works out of the box.
    """
    if not app_settings.nvidia_api_key:
        return

    from sqlalchemy import select
    from app.core.encryption import encrypt_key
    from app.providers.nvidia import NvidiaProvider

    factory = get_session_factory()
    async with factory() as session:
        stmt = select(ProviderConfig).where(ProviderConfig.provider_name == "nvidia")
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if not existing:
            cfg = ProviderConfig(
                provider_name="nvidia",
                encrypted_key=encrypt_key(app_settings.nvidia_api_key),
                priority_order=1,
                is_enabled=True,
                is_fallback=False,
                status="not_configured",
            )
            session.add(cfg)
            await session.commit()
            logger.info("Auto-registered NVIDIA provider from environment")

        # Add to router if not already present
        router = get_router()
        if router.get_provider_by_name("nvidia") is None:
            provider = NvidiaProvider(api_key=app_settings.nvidia_api_key)
            router.add_provider(provider, priority=1)
            logger.info("NVIDIA provider loaded from environment")


app = create_app()
