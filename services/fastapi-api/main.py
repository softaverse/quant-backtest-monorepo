from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import backtest, options

app = FastAPI(
    title="Backtest Portfolio API",
    description="Backtest U.S. stock portfolios and options strategies to analyze long-term performance with historical data.",
    version="1.1.0",
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(backtest.router, prefix="/api/v1", tags=["backtest"])
app.include_router(options.router, prefix="/api/v1", tags=["options"])


@app.get("/")
async def root():
    return {"message": "Welcome to Backtest Portfolio API", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
