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


def calculate_sharpe_ratio(
    returns: pd.Series, risk_free_rate: float = 0.02, periods_per_year: int = 12
) -> float:
    """
    計算夏普比率 (Sharpe Ratio)
    Sharpe = (Portfolio Return - Risk Free Rate) / Standard Deviation
    """
    if returns.empty or returns.std() == 0:
        return 0.0
    annualized_return = returns.mean() * periods_per_year
    annualized_std = returns.std() * np.sqrt(periods_per_year)
    return (annualized_return - risk_free_rate) / annualized_std


def calculate_sortino_ratio(
    returns: pd.Series, risk_free_rate: float = 0.02, periods_per_year: int = 12
) -> float:
    """
    計算索提諾比率 (Sortino Ratio)
    Sortino = (Portfolio Return - Risk Free Rate) / Downside Deviation
    只考慮負報酬的標準差
    """
    if returns.empty:
        return 0.0
    negative_returns = returns[returns < 0]
    if negative_returns.empty or negative_returns.std() == 0:
        return 0.0
    annualized_return = returns.mean() * periods_per_year
    downside_std = negative_returns.std() * np.sqrt(periods_per_year)
    return (annualized_return - risk_free_rate) / downside_std


def calculate_yearly_returns(equity_curve: pd.Series) -> pd.Series:
    """
    計算年度報酬率
    """
    # 按年重新採樣，取每年最後一個值
    yearly_values = equity_curve.resample("YE").last()
    # 計算年度報酬率
    yearly_returns = yearly_values.pct_change().dropna()
    return yearly_returns


def calculate_best_year(equity_curve: pd.Series) -> float:
    """
    計算最佳年度報酬率
    """
    yearly_returns = calculate_yearly_returns(equity_curve)
    if yearly_returns.empty:
        return 0.0
    return yearly_returns.max()


def calculate_worst_year(equity_curve: pd.Series) -> float:
    """
    計算最差年度報酬率
    """
    yearly_returns = calculate_yearly_returns(equity_curve)
    if yearly_returns.empty:
        return 0.0
    return yearly_returns.min()


def calculate_benchmark_correlation(
    portfolio_returns: pd.Series, benchmark_returns: pd.Series
) -> float:
    """
    計算投資組合與基準指數的相關係數
    """
    if portfolio_returns.empty or benchmark_returns.empty:
        return 0.0
    # 確保兩者的索引對齊
    aligned = pd.concat([portfolio_returns, benchmark_returns], axis=1).dropna()
    if len(aligned) < 2:
        return 0.0
    correlation = aligned.iloc[:, 0].corr(aligned.iloc[:, 1])
    return correlation if not pd.isna(correlation) else 0.0


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
        monthly_prices = price_data.resample("ME").last()
        monthly_returns = monthly_prices.pct_change().fillna(0)  # 第一個月報酬率設為 0

        # 計算組合報酬率（加權平均）
        weights_array = np.array([self.weights[t] for t in self.tickers])
        portfolio_returns = (monthly_returns * weights_array).sum(axis=1)

        # 計算淨值曲線（從初始資金開始）
        self.portfolio_value = (1 + portfolio_returns).cumprod() * self.initial_capital

        # 計算統計指標
        years = len(self.portfolio_value) / 12
        final_value = self.portfolio_value.iloc[-1]

        # 排除第一個月的 0 報酬率來計算波動率
        returns_for_volatility = portfolio_returns.iloc[1:] if len(portfolio_returns) > 1 else portfolio_returns

        stats = {
            "initial_capital": self.initial_capital,
            "final_value": round(final_value, 2),
            "cagr": round(calculate_cagr(self.initial_capital, final_value, years) * 100, 2),
            "max_drawdown": round(calculate_max_drawdown(self.portfolio_value) * 100, 2),
            "annualized_volatility": round(
                calculate_annualized_volatility(returns_for_volatility) * 100, 2
            ),
            "total_return": round(
                (final_value / self.initial_capital - 1) * 100, 2
            ),
            "sharpe_ratio": round(calculate_sharpe_ratio(returns_for_volatility), 2),
            "sortino_ratio": round(calculate_sortino_ratio(returns_for_volatility), 2),
            "best_year": round(calculate_best_year(self.portfolio_value) * 100, 2),
            "worst_year": round(calculate_worst_year(self.portfolio_value) * 100, 2),
        }

        # 淨值曲線數據
        equity_curve = [
            {"date": date.strftime("%Y-%m"), "value": round(value, 2)}
            for date, value in self.portfolio_value.items()
        ]

        # 個股統計（排除第一個月的 0 報酬率來計算）
        returns_for_stats = portfolio_returns.iloc[1:] if len(portfolio_returns) > 1 else portfolio_returns
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
            "portfolio_returns": portfolio_returns,  # For correlation calculation
        }
