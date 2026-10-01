"""
DevPilot — FastAPI backend entry-point.

Run with:
    python main.py          # or
    uvicorn main:app --reload --port 8080
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import auth, chat, repos
from app.services.vector_service import ensure_collection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("gitwhisper")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Initialising database …")
    await init_db()
    logger.info("Ensuring Qdrant collection …")
    await ensure_collection()
    logger.info("Pre-warming embedding model …")
    from app.services import vector_service
    await vector_service.get_embedding("warmup")
    logger.info("GitWhisper backend ready on port %s", settings.port)
    yield


app = FastAPI(title="GitWhisper", version="1.0.0", lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(repos.router, prefix="/api/repos", tags=["Repositories"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {"status": "OK"}


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
