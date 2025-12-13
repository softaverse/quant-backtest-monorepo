from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import backtest

app = FastAPI(
    title="QuantiPy API",
    description="高性能美股投資組合回測系統 API",
    version="1.0.0",
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


@app.get("/")
async def root():
    return {"message": "Welcome to QuantiPy API", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
