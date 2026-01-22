from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from config import get_settings
from database import init_db
from routers import backtest, options
from routers.auth import router as auth_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="Backtest Portfolio API",
    description="Backtest U.S. stock portfolios and analyze long-term performance with historical data.",
    version="1.1.0",
    lifespan=lifespan,
)

# Session middleware required for OAuth flow
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret_key)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(backtest.router, prefix="/api/v1", tags=["backtest"])
app.include_router(options.router, prefix="/api/v1", tags=["options"])
app.include_router(auth_router, prefix="/api/v1", tags=["auth"])


@app.get("/")
async def root():
    return {"message": "Welcome to Backtest Portfolio API", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
