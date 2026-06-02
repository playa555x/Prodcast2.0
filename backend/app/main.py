"""FastAPI-App: CORS, Router-Registrierung, Health, Lifespan/DB-Init."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import auth, comfyui, game, liveops, rewards
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title=settings.APP_NAME, version=__version__, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Mobile-Client; in Produktion einschränken.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(game.router)
app.include_router(rewards.router)
app.include_router(comfyui.router)
app.include_router(liveops.router)


@app.get("/")
def root() -> dict:
    return {"name": settings.APP_NAME, "version": __version__, "status": "ok"}


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "healthy",
        "version": __version__,
        "content_tier": settings.CONTENT_TIER,
    }
