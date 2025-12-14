"""
Options Backtest Engine
Daily P&L calculation with Greeks tracking
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

from .pricing.black_scholes import black_scholes_vectorized
from .pricing.greeks import calculate_greeks_vectorized
from strategies import get_strategy, BaseStrategy, PositionType


@dataclass
class OptionsBacktestConfig:
    """Configuration for options backtest"""

    ticker: str
    strategy_type: str
    start_date: str
    end_date: str
    initial_capital: float
    days_to_expiration: int  # DTE at entry
    strike_selection: dict[str, str]  # Per leg: {"leg_0": "ATM", "leg_1": "OTM_5%"}
    position_size: int = 1  # Number of contracts
    volatility_model: str = "historical"  # "historical" or "fixed"
    fixed_volatility: Optional[float] = None
    risk_free_rate: float = 0.045
    roll_before_expiry: int = 0  # Days before expiry to roll (0 = hold to expiry)


@dataclass
class OptionsBacktestResult:
    """Results from options backtest"""

    stats: dict
    daily_pnl: list[dict]
    greeks_series: list[dict]
    payoff_diagram: list[dict]
    trades: list[dict]


class OptionsBacktestEngine:
    """
    Options backtesting engine with daily mark-to-market

    Since yfinance doesn't provide historical option prices,
    we simulate option prices using Black-Scholes with historical volatility.
    """

    def __init__(self, config: OptionsBacktestConfig):
        self.config = config
        self.strategy = get_strategy(config.strategy_type)

    def run(
        self, price_data: pd.DataFrame, volatility_data: pd.Series
    ) -> OptionsBacktestResult:
        """
        Run options backtest

        Args:
            price_data: DataFrame with 'Close' column
            volatility_data: Series with historical volatility

        Returns:
            OptionsBacktestResult with stats, P&L, Greeks, and trades
        """
        strategy_def = self.strategy.get_definition()
        legs = strategy_def.legs

        # Prepare data
        prices = price_data["Close"].values
        dates = price_data.index
        volatility = volatility_data.values

        # Fill NaN volatility with default
        volatility = pd.Series(volatility).ffill().bfill().values
        if np.isnan(volatility).all():
            volatility = np.full_like(volatility, 0.3)

        if (
            self.config.volatility_model == "fixed"
            and self.config.fixed_volatility is not None
        ):
            volatility = np.full_like(volatility, self.config.fixed_volatility)

        # Initialize tracking
        daily_pnl = []
        greeks_series = []
        trades = []

        # Entry point
        entry_idx = 0
        entry_price = prices[entry_idx]
        entry_date = dates[entry_idx]

        # Calculate strikes based on entry price
        strikes = self._calculate_strikes(entry_price, legs)

        # Calculate entry premiums using BS
        T_entry = self.config.days_to_expiration / 365
        entry_premiums = []

        for i, leg in enumerate(legs):
            premium = black_scholes_vectorized(
                S=np.array([entry_price]),
                K=strikes[i],
                T=np.array([T_entry]),
                r=self.config.risk_free_rate,
                sigma=np.array([volatility[entry_idx]]),
                option_type=leg.option_type.value,
            )[0]
            entry_premiums.append(premium)

        # Calculate net premium (entry cost)
        net_premium = self._calculate_net_premium(legs, entry_premiums)

        # Record entry trade
        trades.append(
            {
                "date": str(entry_date.date()),
                "action": "OPEN",
                "strategy": strategy_def.name,
                "strikes": [round(s, 2) for s in strikes],
                "premiums": [round(p, 4) for p in entry_premiums],
                "net_premium": round(net_premium * 100 * self.config.position_size, 2),
                "spot_price": round(entry_price, 2),
            }
        )

        # Daily simulation
        position_value = (
            self.config.initial_capital + net_premium * 100 * self.config.position_size
        )
        peak_value = position_value

        for day_idx in range(len(dates)):
            current_date = dates[day_idx]
            current_price = prices[day_idx]
            current_vol = volatility[day_idx]

            # Calculate time to expiration
            days_elapsed = day_idx
            dte = max(self.config.days_to_expiration - days_elapsed, 0)
            T = dte / 365

            # Calculate current option values
            current_premiums = self._calculate_current_premiums(
                current_price, strikes, T, current_vol, legs
            )

            # Calculate position P&L
            option_pnl = self._calculate_option_pnl(
                legs, entry_premiums, current_premiums
            )

            # Stock leg P&L (if any)
            stock_pnl = 0
            if strategy_def.stock_leg:
                stock_pnl = (current_price - entry_price) * strategy_def.stock_leg.quantity
                if strategy_def.stock_leg.position_type == PositionType.SHORT:
                    stock_pnl = -stock_pnl

            total_pnl = (option_pnl * 100 + stock_pnl) * self.config.position_size
            position_value = self.config.initial_capital + total_pnl
            peak_value = max(peak_value, position_value)

            daily_pnl.append(
                {
                    "date": str(current_date.date()),
                    "spot_price": round(current_price, 2),
                    "position_value": round(position_value, 2),
                    "daily_pnl": round(total_pnl, 2),
                    "dte": dte,
                }
            )

            # Calculate and store Greeks
            if T > 0:
                total_greeks = self._calculate_position_greeks(
                    current_price, strikes, T, current_vol, legs, strategy_def
                )
                greeks_series.append(
                    {
                        "date": str(current_date.date()),
                        **{k: round(v, 4) for k, v in total_greeks.items()},
                    }
                )

            # Check for expiration
            if dte == 0:
                # Record closing trade
                trades.append(
                    {
                        "date": str(current_date.date()),
                        "action": "EXPIRE",
                        "strategy": strategy_def.name,
                        "strikes": [round(s, 2) for s in strikes],
                        "final_premiums": [round(p, 4) for p in current_premiums],
                        "final_pnl": round(total_pnl, 2),
                        "spot_price": round(current_price, 2),
                    }
                )
                break

        # Calculate statistics
        pnl_values = [p["daily_pnl"] for p in daily_pnl]
        final_pnl = pnl_values[-1] if pnl_values else 0

        # Generate payoff diagram
        payoff_diagram = self._generate_payoff_diagram(
            entry_price, strikes, entry_premiums
        )

        stats = self._calculate_stats(
            entry_date,
            dates,
            daily_pnl,
            pnl_values,
            final_pnl,
            strikes,
            entry_premiums,
            strategy_def,
        )

        return OptionsBacktestResult(
            stats=stats,
            daily_pnl=daily_pnl,
            greeks_series=greeks_series,
            payoff_diagram=payoff_diagram,
            trades=trades,
        )

    def _calculate_strikes(self, spot_price: float, legs) -> list[float]:
        """Calculate strikes based on selection method"""
        strikes = []

        for i, leg in enumerate(legs):
            selection = self.config.strike_selection.get(
                f"leg_{i}", leg.strike_selection
            )

            if selection == "ATM":
                strike = spot_price
            elif selection.startswith("OTM_"):
                pct = float(selection.split("_")[1].replace("%", ""))
                if leg.option_type.value == "call":
                    strike = spot_price * (1 + pct / 100)
                else:
                    strike = spot_price * (1 - pct / 100)
            elif selection.startswith("ITM_"):
                pct = float(selection.split("_")[1].replace("%", ""))
                if leg.option_type.value == "call":
                    strike = spot_price * (1 - pct / 100)
                else:
                    strike = spot_price * (1 + pct / 100)
            else:
                # Assume absolute strike value
                try:
                    strike = float(selection)
                except ValueError:
                    strike = spot_price

            strikes.append(round(strike, 2))

        return strikes

    def _calculate_net_premium(self, legs, premiums: list[float]) -> float:
        """Calculate net premium (negative = debit, positive = credit)"""
        net = 0
        for i, leg in enumerate(legs):
            if leg.position_type == PositionType.LONG:
                net -= premiums[i] * leg.quantity
            else:
                net += premiums[i] * leg.quantity
        return net

    def _calculate_current_premiums(
        self,
        current_price: float,
        strikes: list[float],
        T: float,
        current_vol: float,
        legs,
    ) -> list[float]:
        """Calculate current option premiums"""
        current_premiums = []
        for i, leg in enumerate(legs):
            if T > 0:
                premium = black_scholes_vectorized(
                    S=np.array([current_price]),
                    K=strikes[i],
                    T=np.array([T]),
                    r=self.config.risk_free_rate,
                    sigma=np.array([current_vol]),
                    option_type=leg.option_type.value,
                )[0]
            else:
                # At expiration - intrinsic value only
                if leg.option_type.value == "call":
                    premium = max(current_price - strikes[i], 0)
                else:
                    premium = max(strikes[i] - current_price, 0)
            current_premiums.append(premium)
        return current_premiums

    def _calculate_option_pnl(
        self, legs, entry_premiums: list[float], current_premiums: list[float]
    ) -> float:
        """Calculate option P&L"""
        pnl = 0
        for i, leg in enumerate(legs):
            leg_pnl = current_premiums[i] - entry_premiums[i]
            if leg.position_type == PositionType.LONG:
                pnl += leg_pnl * leg.quantity
            else:
                pnl -= leg_pnl * leg.quantity
        return pnl

    def _calculate_position_greeks(
        self,
        current_price: float,
        strikes: list[float],
        T: float,
        current_vol: float,
        legs,
        strategy_def,
    ) -> dict[str, float]:
        """Calculate total position Greeks"""
        total_greeks = {"delta": 0.0, "gamma": 0.0, "theta": 0.0, "vega": 0.0, "rho": 0.0}

        for i, leg in enumerate(legs):
            leg_greeks = calculate_greeks_vectorized(
                S=np.array([current_price]),
                K=strikes[i],
                T=np.array([T]),
                r=self.config.risk_free_rate,
                sigma=np.array([current_vol]),
                option_type=leg.option_type.value,
            )
            multiplier = (
                leg.quantity
                if leg.position_type == PositionType.LONG
                else -leg.quantity
            )
            for greek in total_greeks:
                total_greeks[greek] += leg_greeks[greek][0] * multiplier

        # Add stock delta if applicable
        if strategy_def.stock_leg:
            stock_delta = (
                1 if strategy_def.stock_leg.position_type == PositionType.LONG else -1
            )
            total_greeks["delta"] += stock_delta

        return total_greeks

    def _generate_payoff_diagram(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
    ) -> list[dict]:
        """Generate payoff diagram data points"""
        min_price = min(strikes + [spot_price]) * 0.8
        max_price = max(strikes + [spot_price]) * 1.2

        price_range = np.linspace(min_price, max_price, 100)
        payoffs = []

        strategy_def = self.strategy.get_definition()

        for price in price_range:
            # Use strategy's calculate_payoff method
            if strategy_def.stock_leg:
                payoff = self.strategy.calculate_payoff(
                    price, strikes, premiums, entry_stock_price=spot_price
                )
            else:
                payoff = self.strategy.calculate_payoff(price, strikes, premiums)

            payoffs.append(
                {
                    "price": round(price, 2),
                    "payoff": round(payoff * 100 * self.config.position_size, 2),
                }
            )

        return payoffs

    def _calculate_stats(
        self,
        entry_date,
        dates,
        daily_pnl: list[dict],
        pnl_values: list[float],
        final_pnl: float,
        strikes: list[float],
        entry_premiums: list[float],
        strategy_def,
    ) -> dict:
        """Calculate backtest statistics"""
        # Get breakeven points
        if strategy_def.stock_leg:
            breakevens = self.strategy.get_breakeven(
                strikes, entry_premiums, entry_stock_price=daily_pnl[0]["spot_price"]
            )
        else:
            breakevens = self.strategy.get_breakeven(strikes, entry_premiums)

        return {
            "initial_capital": self.config.initial_capital,
            "final_value": round(self.config.initial_capital + final_pnl, 2),
            "total_pnl": round(final_pnl, 2),
            "total_return": round(final_pnl / self.config.initial_capital * 100, 2),
            "max_profit": round(max(pnl_values) if pnl_values else 0, 2),
            "max_loss": round(min(pnl_values) if pnl_values else 0, 2),
            "max_drawdown": round(self._calculate_max_drawdown(pnl_values), 2),
            "win_rate": self._calculate_win_rate(final_pnl),
            "strategy": strategy_def.name,
            "days_held": len(daily_pnl),
            "entry_date": str(entry_date.date()),
            "exit_date": str(dates[min(len(dates) - 1, len(daily_pnl) - 1)].date()),
            "breakeven_points": [round(b, 2) for b in breakevens] if breakevens else [],
        }

    def _calculate_max_drawdown(self, pnl_values: list[float]) -> float:
        """Calculate maximum drawdown from P&L series"""
        if not pnl_values:
            return 0

        cumulative = np.array(pnl_values)
        peak = np.maximum.accumulate(cumulative)
        drawdown = cumulative - peak
        return abs(min(drawdown)) if len(drawdown) > 0 else 0

    def _calculate_win_rate(self, final_pnl: float) -> float:
        """Calculate win rate (simple binary for single trade)"""
        return 100.0 if final_pnl > 0 else 0.0
