"""
向量化回測引擎 (Vectorized Backtest Engine)
使用 Pandas 與 VectorBT 進行高效能回測計算
"""

import pandas as pd
import numpy as np
from typing import Optional
from datetime import datetime


def calculate_cagr(
    initial_value: float, final_value: float, years: float
) -> float:
    """
    計算年化複合增長率 (CAGR)
    CAGR = (V_final / V_initial)^(1/t) - 1
    """
    if initial_value <= 0 or years <= 0:
        return 0.0
    return (final_value / initial_value) ** (1 / years) - 1


def calculate_max_drawdown(equity_curve: pd.Series) -> float:
    """
    計算最大回撤 (Maximum Drawdown)
    MDD = (Peak - Trough) / Peak
    """
    peak = equity_curve.expanding(min_periods=1).max()
    drawdown = (equity_curve - peak) / peak
    return abs(drawdown.min())


def calculate_annualized_volatility(
    returns: pd.Series, periods_per_year: int = 12
) -> float:
    """
    計算年化波動度
    """
    return returns.std() * np.sqrt(periods_per_year)


def rebalance_portfolio(
    portfolio_value: float, weights: dict[str, float]
) -> dict[str, float]:
    """
    年度再平衡：將各資產權重恢復至初始比例
    W_t+1 = W_initial * TotalValue_t
    """
    return {ticker: portfolio_value * weight for ticker, weight in weights.items()}


class BacktestEngine:
    """向量化回測引擎"""

    def __init__(
        self,
        tickers: list[str],
        weights: list[float],
        start_date: str,
        end_date: str,
        initial_capital: float = 100000.0,
        rebalance_frequency: str = "yearly",
    ):
        self.tickers = tickers
        self.weights = dict(zip(tickers, weights))
        self.start_date = start_date
        self.end_date = end_date
        self.initial_capital = initial_capital
        self.rebalance_frequency = rebalance_frequency
        self.price_data: Optional[pd.DataFrame] = None
        self.portfolio_value: Optional[pd.Series] = None

    def run(self, price_data: pd.DataFrame) -> dict:
        """
        執行回測
        """
        self.price_data = price_data

        # 計算月度報酬率
        monthly_returns = price_data.resample("ME").last().pct_change().dropna()

        # 計算組合報酬率（加權平均）
        weights_array = np.array([self.weights[t] for t in self.tickers])
        portfolio_returns = (monthly_returns * weights_array).sum(axis=1)

        # 計算淨值曲線
        self.portfolio_value = (1 + portfolio_returns).cumprod() * self.initial_capital

        # 計算統計指標
        years = len(self.portfolio_value) / 12
        final_value = self.portfolio_value.iloc[-1]

        stats = {
            "initial_capital": self.initial_capital,
            "final_value": round(final_value, 2),
            "cagr": round(calculate_cagr(self.initial_capital, final_value, years) * 100, 2),
            "max_drawdown": round(calculate_max_drawdown(self.portfolio_value) * 100, 2),
            "annualized_volatility": round(
                calculate_annualized_volatility(portfolio_returns) * 100, 2
            ),
            "total_return": round(
                (final_value / self.initial_capital - 1) * 100, 2
            ),
        }

        # 淨值曲線數據
        equity_curve = [
            {"date": date.strftime("%Y-%m"), "value": round(value, 2)}
            for date, value in self.portfolio_value.items()
        ]

        # 個股統計
        individual_stats = {}
        for ticker in self.tickers:
            ticker_returns = monthly_returns[ticker]
            ticker_value = (1 + ticker_returns).cumprod() * self.initial_capital * self.weights[ticker]
            ticker_final = ticker_value.iloc[-1]
            individual_stats[ticker] = {
                "weight": self.weights[ticker],
                "total_return": round(
                    (ticker_final / (self.initial_capital * self.weights[ticker]) - 1) * 100, 2
                ),
                "cagr": round(
                    calculate_cagr(
                        self.initial_capital * self.weights[ticker], ticker_final, years
                    )
                    * 100,
                    2,
                ),
            }

        return {
            "stats": stats,
            "equity_curve": equity_curve,
            "individual_stats": individual_stats,
        }
