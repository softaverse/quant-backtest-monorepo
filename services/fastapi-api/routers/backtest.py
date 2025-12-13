"""
回測 API 端點
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.engine import BacktestEngine
from data.fetcher import fetch_stock_data, validate_tickers

router = APIRouter()


class BacktestRequest(BaseModel):
    """回測請求參數"""

    tickers: list[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="股票代碼列表 (1-50 檔)",
        examples=[["AAPL", "GOOGL", "MSFT"]],
    )
    weights: list[float] = Field(
        ...,
        description="各股票權重 (總和應為 1.0)",
        examples=[[0.4, 0.3, 0.3]],
    )
    start_date: str = Field(
        ...,
        description="開始日期 (YYYY-MM-DD)",
        examples=["2020-01-01"],
    )
    end_date: str = Field(
        ...,
        description="結束日期 (YYYY-MM-DD)",
        examples=["2024-01-01"],
    )
    initial_capital: float = Field(
        default=100000.0,
        gt=0,
        description="初始資金",
    )
    rebalance_frequency: str = Field(
        default="yearly",
        description="再平衡頻率 (yearly)",
    )


class EquityCurvePoint(BaseModel):
    """淨值曲線數據點"""

    date: str
    value: float


class StockStats(BaseModel):
    """個股統計"""

    weight: float
    total_return: float
    cagr: float


class PortfolioStats(BaseModel):
    """組合統計"""

    initial_capital: float
    final_value: float
    cagr: float
    max_drawdown: float
    annualized_volatility: float
    total_return: float


class BacktestResponse(BaseModel):
    """回測結果"""

    stats: PortfolioStats
    equity_curve: list[EquityCurvePoint]
    individual_stats: dict[str, StockStats]


@router.post("/backtest", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """
    執行投資組合回測

    - **tickers**: 股票代碼列表 (最多 50 檔)
    - **weights**: 各股票權重 (總和應為 1.0)
    - **start_date**: 回測開始日期
    - **end_date**: 回測結束日期
    - **initial_capital**: 初始資金 (預設 100,000)
    - **rebalance_frequency**: 再平衡頻率 (預設 yearly)
    """
    # 驗證權重
    if len(request.tickers) != len(request.weights):
        raise HTTPException(
            status_code=400,
            detail="股票數量與權重數量不符",
        )

    weight_sum = sum(request.weights)
    if not (0.99 <= weight_sum <= 1.01):
        raise HTTPException(
            status_code=400,
            detail=f"權重總和必須為 1.0，目前為 {weight_sum}",
        )

    # 獲取股價數據
    try:
        price_data = fetch_stock_data(
            tickers=request.tickers,
            start_date=request.start_date,
            end_date=request.end_date,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"無法獲取股價數據: {str(e)}",
        )

    if price_data.empty:
        raise HTTPException(
            status_code=400,
            detail="找不到指定時間範圍的股價數據",
        )

    # 執行回測
    engine = BacktestEngine(
        tickers=request.tickers,
        weights=request.weights,
        start_date=request.start_date,
        end_date=request.end_date,
        initial_capital=request.initial_capital,
        rebalance_frequency=request.rebalance_frequency,
    )

    result = engine.run(price_data)

    return result


@router.post("/validate-tickers")
async def validate_ticker_symbols(tickers: list[str]):
    """
    驗證股票代碼是否有效
    """
    if len(tickers) > 50:
        raise HTTPException(
            status_code=400,
            detail="一次最多驗證 50 個股票代碼",
        )

    results = validate_tickers(tickers)
    return {"results": results}
