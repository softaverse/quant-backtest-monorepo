"""
Backtest History API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.backtest_history import BacktestHistory
from auth.dependencies import get_current_user
from schemas.history import (
    HistoryResponse,
    HistoryListResponse,
    HistorySummary,
    RunAndSaveRequest,
    RunAndSaveResponse,
)
from core.engine import (
    BacktestEngine,
    calculate_sharpe_ratio,
    calculate_sortino_ratio,
    calculate_best_year,
    calculate_worst_year,
    calculate_benchmark_correlation,
)
from data.fetcher import fetch_stock_data

router = APIRouter(prefix="/backtest", tags=["backtest-history"])


@router.get("/history", response_model=HistoryListResponse)
async def list_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List user's backtest history."""
    query = db.query(BacktestHistory).filter(BacktestHistory.user_id == current_user.id)

    total = query.count()
    history = (
        query.order_by(BacktestHistory.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return HistoryListResponse(history=history, total=total)


@router.get("/history/{history_id}", response_model=HistoryResponse)
async def get_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single backtest history entry with full results."""
    history = (
        db.query(BacktestHistory)
        .filter(
            BacktestHistory.id == history_id,
            BacktestHistory.user_id == current_user.id,
        )
        .first()
    )

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found",
        )

    return history


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a backtest history entry."""
    history = (
        db.query(BacktestHistory)
        .filter(
            BacktestHistory.id == history_id,
            BacktestHistory.user_id == current_user.id,
        )
        .first()
    )

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found",
        )

    db.delete(history)
    db.commit()
    return None


@router.post("/run-and-save", response_model=RunAndSaveResponse)
async def run_and_save_backtest(
    request: RunAndSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run a backtest and optionally save results to history."""
    # Validate weights
    if len(request.tickers) != len(request.weights):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Number of tickers must match number of weights",
        )

    weight_sum = sum(request.weights)
    if not (0.99 <= weight_sum <= 1.01):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Weights must sum to 1.0, currently sum to {weight_sum}",
        )

    # Fetch stock data
    try:
        price_data, actual_start, actual_end = fetch_stock_data(
            tickers=request.tickers,
            start_date=request.start_date,
            end_date=request.end_date,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch stock data: {str(e)}",
        )

    if price_data.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No price data found for the specified date range",
        )

    # Fetch benchmark data
    try:
        benchmark_data, _, _ = fetch_stock_data(
            tickers=["VFINX"],
            start_date=request.start_date,
            end_date=request.end_date,
        )
    except Exception:
        benchmark_data = None

    # Run backtest
    engine = BacktestEngine(
        tickers=request.tickers,
        weights=request.weights,
        start_date=actual_start,
        end_date=actual_end,
        initial_capital=request.initial_capital,
        rebalance_frequency=request.rebalance_frequency,
    )

    result = engine.run(price_data)

    # Add date range
    result["date_range"] = {
        "start_date": actual_start,
        "end_date": actual_end,
    }

    # Calculate benchmark stats
    benchmark_curve = []
    benchmark_stats = {
        "initial_capital": request.initial_capital,
        "final_value": request.initial_capital,
        "total_return": 0,
        "cagr": 0,
        "max_drawdown": 0,
        "annualized_volatility": 0,
        "sharpe_ratio": 0,
        "sortino_ratio": 0,
        "best_year": 0,
        "worst_year": 0,
        "benchmark_correlation": 1.0,
    }

    if benchmark_data is not None and not benchmark_data.empty:
        benchmark_monthly = benchmark_data["VFINX"].resample("ME").last().dropna()

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
                "sharpe_ratio": round(calculate_sharpe_ratio(returns_for_volatility), 2),
                "sortino_ratio": round(calculate_sortino_ratio(returns_for_volatility), 2),
                "best_year": round(calculate_best_year(benchmark_values) * 100, 2),
                "worst_year": round(calculate_worst_year(benchmark_values) * 100, 2),
                "benchmark_correlation": 1.0,
            }

            # Calculate portfolio-benchmark correlation
            benchmark_correlation = calculate_benchmark_correlation(
                result["portfolio_returns"], benchmark_returns
            )
            result["stats"]["benchmark_correlation"] = round(benchmark_correlation, 2)

    result["benchmark_curve"] = benchmark_curve
    result["benchmark_stats"] = benchmark_stats

    # Remove internal data
    portfolio_returns = result.pop("portfolio_returns", None)

    # Save to history if requested
    history_id = None
    if request.save_to_history:
        history_entry = BacktestHistory(
            user_id=current_user.id,
            portfolio_id=request.portfolio_id,
            portfolio_name=request.portfolio_name,
            tickers=request.tickers,
            weights=request.weights,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=request.initial_capital,
            rebalance_frequency=request.rebalance_frequency,
            final_value=result["stats"]["final_value"],
            total_return=result["stats"]["total_return"],
            cagr=result["stats"]["cagr"],
            max_drawdown=result["stats"]["max_drawdown"],
            sharpe_ratio=result["stats"]["sharpe_ratio"],
            full_results=result,
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        history_id = history_entry.id

    return RunAndSaveResponse(
        history_id=history_id,
        stats=result["stats"],
        equity_curve=result["equity_curve"],
        individual_stats=result["individual_stats"],
        date_range=result["date_range"],
        benchmark_curve=result["benchmark_curve"],
        benchmark_stats=result["benchmark_stats"],
    )
