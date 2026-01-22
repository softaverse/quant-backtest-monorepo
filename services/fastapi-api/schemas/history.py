"""
Pydantic schemas for backtest history endpoints.
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class HistoryCreate(BaseModel):
    """Schema for creating a new backtest history entry."""
    portfolio_id: Optional[int] = Field(None, description="Associated saved portfolio ID")
    portfolio_name: Optional[str] = Field(None, description="Portfolio name")
    tickers: list[str] = Field(..., description="List of ticker symbols")
    weights: list[float] = Field(..., description="List of weights")
    start_date: str = Field(..., description="Backtest start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="Backtest end date (YYYY-MM-DD)")
    initial_capital: float = Field(..., description="Initial capital")
    rebalance_frequency: str = Field(default="yearly", description="Rebalance frequency")
    final_value: Optional[float] = Field(None, description="Final portfolio value")
    total_return: Optional[float] = Field(None, description="Total return percentage")
    cagr: Optional[float] = Field(None, description="CAGR percentage")
    max_drawdown: Optional[float] = Field(None, description="Max drawdown percentage")
    sharpe_ratio: Optional[float] = Field(None, description="Sharpe ratio")
    full_results: Optional[dict[str, Any]] = Field(None, description="Full backtest results")


class HistorySummary(BaseModel):
    """Schema for history entry summary (without full results)."""
    id: int
    user_id: int
    portfolio_id: Optional[int] = None
    portfolio_name: Optional[str] = None
    tickers: list[str]
    weights: list[float]
    start_date: str
    end_date: str
    initial_capital: float
    rebalance_frequency: str
    final_value: Optional[float] = None
    total_return: Optional[float] = None
    cagr: Optional[float] = None
    max_drawdown: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    """Schema for full history response (with full results)."""
    id: int
    user_id: int
    portfolio_id: Optional[int] = None
    portfolio_name: Optional[str] = None
    tickers: list[str]
    weights: list[float]
    start_date: str
    end_date: str
    initial_capital: float
    rebalance_frequency: str
    final_value: Optional[float] = None
    total_return: Optional[float] = None
    cagr: Optional[float] = None
    max_drawdown: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    full_results: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryListResponse(BaseModel):
    """Schema for listing history entries."""
    history: list[HistorySummary]
    total: int


class RunAndSaveRequest(BaseModel):
    """Schema for running a backtest and saving to history."""
    tickers: list[str] = Field(..., min_length=1, max_length=50, description="List of ticker symbols")
    weights: list[float] = Field(..., description="List of weights")
    start_date: str = Field(..., description="Backtest start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="Backtest end date (YYYY-MM-DD)")
    initial_capital: float = Field(default=100000.0, gt=0, description="Initial capital")
    rebalance_frequency: str = Field(default="yearly", description="Rebalance frequency")
    portfolio_name: Optional[str] = Field(None, description="Optional portfolio name")
    portfolio_id: Optional[int] = Field(None, description="Optional saved portfolio ID")
    save_to_history: bool = Field(default=True, description="Whether to save to history")


class RunAndSaveResponse(BaseModel):
    """Schema for run and save response."""
    history_id: Optional[int] = None
    stats: dict[str, Any]
    equity_curve: list[dict[str, Any]]
    individual_stats: dict[str, Any]
    date_range: dict[str, str]
    benchmark_curve: list[dict[str, Any]]
    benchmark_stats: dict[str, Any]
