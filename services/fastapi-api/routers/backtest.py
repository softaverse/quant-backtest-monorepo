"""
回測 API 端點
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.engine import BacktestEngine
from data.fetcher import fetch_stock_data, validate_tickers

router = APIRouter()


class PortfolioInput(BaseModel):
    """單一投資組合輸入"""

    name: str = Field(..., description="組合名稱")
    tickers: list[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="股票代碼列表 (1-50 檔)",
    )
    weights: list[float] = Field(
        ...,
        description="各股票權重 (總和應為 1.0)",
    )


class BacktestRequest(BaseModel):
    """回測請求參數（單一組合，保留向後相容）"""

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


class BatchBacktestRequest(BaseModel):
    """批次回測請求參數"""

    portfolios: list[PortfolioInput] = Field(
        ...,
        min_length=1,
        max_length=3,
        description="投資組合列表 (最多 3 組)",
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


class DateRange(BaseModel):
    """實際交易日期範圍"""

    start_date: str
    end_date: str


class BenchmarkStats(BaseModel):
    """基準指數統計"""

    initial_capital: float
    final_value: float
    total_return: float
    cagr: float
    max_drawdown: float
    annualized_volatility: float


class BacktestResponse(BaseModel):
    """回測結果（單一組合）"""

    stats: PortfolioStats
    equity_curve: list[EquityCurvePoint]
    individual_stats: dict[str, StockStats]
    date_range: DateRange
    benchmark_curve: list[EquityCurvePoint]
    benchmark_stats: BenchmarkStats


class PortfolioResult(BaseModel):
    """單一組合回測結果"""

    name: str
    stats: PortfolioStats
    equity_curve: list[EquityCurvePoint]
    individual_stats: dict[str, StockStats]


class BatchBacktestResponse(BaseModel):
    """批次回測結果"""

    portfolios: list[PortfolioResult]
    date_range: DateRange
    benchmark_curve: list[EquityCurvePoint]
    benchmark_stats: BenchmarkStats


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
        price_data, actual_start, actual_end = fetch_stock_data(
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

    # 獲取 S&P 500 (SPY) 基準數據
    try:
        benchmark_data, _, _ = fetch_stock_data(
            tickers=["SPY"],
            start_date=request.start_date,
            end_date=request.end_date,
        )
    except Exception:
        benchmark_data = None

    # 執行回測
    engine = BacktestEngine(
        tickers=request.tickers,
        weights=request.weights,
        start_date=actual_start,
        end_date=actual_end,
        initial_capital=request.initial_capital,
        rebalance_frequency=request.rebalance_frequency,
    )

    result = engine.run(price_data)

    # 加入實際日期範圍
    result["date_range"] = {
        "start_date": actual_start,
        "end_date": actual_end,
    }

    # 計算基準指數表現（使用月度數據以匹配組合）
    if benchmark_data is not None and not benchmark_data.empty:
        # 轉換為月度數據（與組合計算方式一致）
        benchmark_monthly = benchmark_data["SPY"].resample("ME").last().dropna()

        if not benchmark_monthly.empty:
            # 計算月度報酬率（第一個月設為 0，與組合一致）
            benchmark_returns = benchmark_monthly.pct_change().fillna(0)

            # 計算基準淨值曲線（以初始資金為基準）
            benchmark_cumulative = (1 + benchmark_returns).cumprod()
            benchmark_values = benchmark_cumulative * request.initial_capital

            # 使用 YYYY-MM 格式（與組合一致）
            result["benchmark_curve"] = [
                {"date": date.strftime("%Y-%m"), "value": round(value, 2)}
                for date, value in benchmark_values.items()
            ]

            # 計算基準統計
            years = len(benchmark_values) / 12
            final_value = benchmark_values.iloc[-1]
            total_return = (final_value / request.initial_capital - 1) * 100
            cagr = ((final_value / request.initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0

            # 計算最大回撤
            rolling_max = benchmark_values.cummax()
            drawdown = (benchmark_values - rolling_max) / rolling_max
            max_drawdown = abs(drawdown.min()) * 100

            # 計算年化波動率（排除第一個月的 0 報酬率）
            returns_for_volatility = benchmark_returns.iloc[1:] if len(benchmark_returns) > 1 else benchmark_returns
            annualized_volatility = returns_for_volatility.std() * (12 ** 0.5) * 100

            result["benchmark_stats"] = {
                "initial_capital": request.initial_capital,
                "final_value": round(final_value, 2),
                "total_return": round(total_return, 2),
                "cagr": round(cagr, 2),
                "max_drawdown": round(max_drawdown, 2),
                "annualized_volatility": round(annualized_volatility, 2),
            }
        else:
            result["benchmark_curve"] = []
            result["benchmark_stats"] = {
                "initial_capital": request.initial_capital,
                "final_value": request.initial_capital,
                "total_return": 0,
                "cagr": 0,
                "max_drawdown": 0,
                "annualized_volatility": 0,
            }
    else:
        result["benchmark_curve"] = []
        result["benchmark_stats"] = {
            "initial_capital": request.initial_capital,
            "final_value": request.initial_capital,
            "total_return": 0,
            "cagr": 0,
            "max_drawdown": 0,
            "annualized_volatility": 0,
        }

    return result


@router.post("/backtest/batch", response_model=BatchBacktestResponse)
async def run_batch_backtest(request: BatchBacktestRequest):
    """
    批次執行多個投資組合回測（單次 API 呼叫）

    - **portfolios**: 投資組合列表 (最多 3 組)
    - **start_date**: 回測開始日期
    - **end_date**: 回測結束日期
    - **initial_capital**: 初始資金 (預設 100,000)
    - **rebalance_frequency**: 再平衡頻率 (預設 yearly)
    """
    # 驗證所有組合的權重
    for portfolio in request.portfolios:
        if len(portfolio.tickers) != len(portfolio.weights):
            raise HTTPException(
                status_code=400,
                detail=f"組合 '{portfolio.name}' 的股票數量與權重數量不符",
            )
        weight_sum = sum(portfolio.weights)
        if not (0.99 <= weight_sum <= 1.01):
            raise HTTPException(
                status_code=400,
                detail=f"組合 '{portfolio.name}' 的權重總和必須為 1.0，目前為 {weight_sum}",
            )

    # 收集所有不重複的股票代碼
    all_tickers = set()
    for portfolio in request.portfolios:
        all_tickers.update(portfolio.tickers)
    all_tickers.add("SPY")  # 加入 benchmark
    all_tickers = list(all_tickers)

    # 一次獲取所有股價數據
    try:
        price_data, actual_start, actual_end = fetch_stock_data(
            tickers=all_tickers,
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

    # 執行每個組合的回測
    portfolio_results = []
    for portfolio in request.portfolios:
        # 提取該組合需要的股價數據
        portfolio_price_data = price_data[portfolio.tickers].copy()

        engine = BacktestEngine(
            tickers=portfolio.tickers,
            weights=portfolio.weights,
            start_date=actual_start,
            end_date=actual_end,
            initial_capital=request.initial_capital,
            rebalance_frequency=request.rebalance_frequency,
        )

        result = engine.run(portfolio_price_data)
        portfolio_results.append({
            "name": portfolio.name,
            "stats": result["stats"],
            "equity_curve": result["equity_curve"],
            "individual_stats": result["individual_stats"],
        })

    # 計算基準指數表現
    benchmark_curve = []
    benchmark_stats = {
        "initial_capital": request.initial_capital,
        "final_value": request.initial_capital,
        "total_return": 0,
        "cagr": 0,
        "max_drawdown": 0,
        "annualized_volatility": 0,
    }

    if "SPY" in price_data.columns:
        benchmark_monthly = price_data["SPY"].resample("ME").last().dropna()

        if not benchmark_monthly.empty:
            benchmark_returns = benchmark_monthly.pct_change().fillna(0)
            benchmark_cumulative = (1 + benchmark_returns).cumprod()
            benchmark_values = benchmark_cumulative * request.initial_capital

            benchmark_curve = [
                {"date": date.strftime("%Y-%m"), "value": round(value, 2)}
                for date, value in benchmark_values.items()
            ]

            years = len(benchmark_values) / 12
            final_value = benchmark_values.iloc[-1]
            total_return = (final_value / request.initial_capital - 1) * 100
            cagr = ((final_value / request.initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0

            rolling_max = benchmark_values.cummax()
            drawdown = (benchmark_values - rolling_max) / rolling_max
            max_drawdown = abs(drawdown.min()) * 100

            returns_for_volatility = benchmark_returns.iloc[1:] if len(benchmark_returns) > 1 else benchmark_returns
            annualized_volatility = returns_for_volatility.std() * (12 ** 0.5) * 100

            benchmark_stats = {
                "initial_capital": request.initial_capital,
                "final_value": round(final_value, 2),
                "total_return": round(total_return, 2),
                "cagr": round(cagr, 2),
                "max_drawdown": round(max_drawdown, 2),
                "annualized_volatility": round(annualized_volatility, 2),
            }

    return {
        "portfolios": portfolio_results,
        "date_range": {
            "start_date": actual_start,
            "end_date": actual_end,
        },
        "benchmark_curve": benchmark_curve,
        "benchmark_stats": benchmark_stats,
    }


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
