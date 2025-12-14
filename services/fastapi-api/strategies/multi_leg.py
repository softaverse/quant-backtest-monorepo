"""
Multi-Leg Strategies
Iron Butterfly, Iron Condor, Butterfly Spread, Covered Calls, etc.
"""

from typing import Optional

from .base import (
    BaseStrategy,
    StrategyDefinition,
    OptionLeg,
    StockLeg,
    OptionType,
    PositionType,
)


class IronCondor(BaseStrategy):
    """
    Iron Condor - Profit from low volatility

    Sell OTM strangle, buy further OTM strangle for protection.
    Limited profit and limited loss.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Iron Condor",
            legs=[
                OptionLeg(OptionType.PUT, PositionType.LONG, "OTM_10%"),  # Lower wing
                OptionLeg(OptionType.PUT, PositionType.SHORT, "OTM_5%"),  # Short put
                OptionLeg(OptionType.CALL, PositionType.SHORT, "OTM_5%"),  # Short call
                OptionLeg(OptionType.CALL, PositionType.LONG, "OTM_10%"),  # Upper wing
            ],
            description="Sell OTM strangle, buy further OTM strangle for protection.",
            max_profit="Net credit received",
            max_loss="Width of spread - Net credit",
            breakeven="Short Put Strike - Credit / Short Call Strike + Credit",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K1, K2, K3, K4 = strikes  # K1 < K2 < K3 < K4
        # Long put at K1, short put at K2, short call at K3, long call at K4
        net_credit = premiums[1] + premiums[2] - premiums[0] - premiums[3]

        put_spread = max(K2 - spot_price, 0) - max(K1 - spot_price, 0)
        call_spread = max(spot_price - K3, 0) - max(spot_price - K4, 0)

        return net_credit - put_spread - call_spread

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return premiums[1] + premiums[2] - premiums[0] - premiums[3]

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        width = strikes[1] - strikes[0]  # Assuming equal width spreads
        net_credit = self.get_max_profit(strikes, premiums)
        return width - net_credit

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        net_credit = self.get_max_profit(strikes, premiums)
        return [strikes[1] - net_credit, strikes[2] + net_credit]


class IronButterfly(BaseStrategy):
    """
    Iron Butterfly - Profit from no movement

    Short straddle with protective wings.
    Maximum profit at ATM strike.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Iron Butterfly",
            legs=[
                OptionLeg(OptionType.PUT, PositionType.LONG, "OTM_5%"),
                OptionLeg(OptionType.PUT, PositionType.SHORT, "ATM"),
                OptionLeg(OptionType.CALL, PositionType.SHORT, "ATM"),
                OptionLeg(OptionType.CALL, PositionType.LONG, "OTM_5%"),
            ],
            description="Short straddle with protective wings.",
            max_profit="Net credit received",
            max_loss="Width - Net credit",
            breakeven="ATM Strike +/- Net Credit",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K_low, K_atm_put, K_atm_call, K_high = strikes
        # K_atm_put == K_atm_call for butterfly

        net_credit = premiums[1] + premiums[2] - premiums[0] - premiums[3]

        long_put = max(K_low - spot_price, 0)
        short_put = max(K_atm_put - spot_price, 0)
        short_call = max(spot_price - K_atm_call, 0)
        long_call = max(spot_price - K_high, 0)

        return net_credit - short_put - short_call + long_put + long_call

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return premiums[1] + premiums[2] - premiums[0] - premiums[3]

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        width = strikes[1] - strikes[0]
        return width - self.get_max_profit(strikes, premiums)

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        net_credit = self.get_max_profit(strikes, premiums)
        atm = strikes[1]  # ATM strike
        return [atm - net_credit, atm + net_credit]


class ButterflySpread(BaseStrategy):
    """
    Long Butterfly Spread using calls

    Buy 1 lower, sell 2 middle, buy 1 higher call.
    Maximum profit at middle strike.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Butterfly Spread",
            legs=[
                OptionLeg(OptionType.CALL, PositionType.LONG, "ITM_5%"),
                OptionLeg(OptionType.CALL, PositionType.SHORT, "ATM", quantity=2),
                OptionLeg(OptionType.CALL, PositionType.LONG, "OTM_5%"),
            ],
            description="Buy 1 lower, sell 2 middle, buy 1 higher call.",
            max_profit="Width - Net Debit",
            max_loss="Net Debit",
            breakeven="Lower Strike + Debit / Upper Strike - Debit",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K1, K2, K3 = strikes  # K1 < K2 < K3
        net_debit = premiums[0] + premiums[2] - 2 * premiums[1]

        payoff = (
            max(spot_price - K1, 0)
            - 2 * max(spot_price - K2, 0)
            + max(spot_price - K3, 0)
            - net_debit
        )
        return payoff

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        width = strikes[1] - strikes[0]
        net_debit = premiums[0] + premiums[2] - 2 * premiums[1]
        return width - net_debit

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return premiums[0] + premiums[2] - 2 * premiums[1]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        net_debit = self.get_max_loss(strikes, premiums)
        return [strikes[0] + net_debit, strikes[2] - net_debit]


class CoveredCall(BaseStrategy):
    """
    Covered Call - Income strategy

    Own stock, sell OTM call for income.
    Limited upside but provides income and downside buffer.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Covered Call",
            legs=[
                OptionLeg(OptionType.CALL, PositionType.SHORT, "OTM_5%"),
            ],
            stock_leg=StockLeg(PositionType.LONG, 100),
            description="Own stock, sell OTM call for income.",
            max_profit="Strike - Stock Price + Premium",
            max_loss="Stock Price - Premium (if stock goes to 0)",
            breakeven="Stock Price - Premium",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K, P = strikes[0], premiums[0]
        if entry_stock_price is None:
            entry_stock_price = K * 0.95  # Assume entered below strike

        stock_pnl = spot_price - entry_stock_price
        option_pnl = P - max(spot_price - K, 0)
        return stock_pnl + option_pnl

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        if entry_stock_price is None:
            return strikes[0] * 0.05 + premiums[0]  # Approximation
        return strikes[0] - entry_stock_price + premiums[0]

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        if entry_stock_price is None:
            return float("inf")
        return entry_stock_price - premiums[0]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        if entry_stock_price is None:
            return []
        return [entry_stock_price - premiums[0]]


class ProtectivePut(BaseStrategy):
    """
    Protective Put - Insurance strategy

    Own stock, buy put for downside protection.
    Unlimited upside minus premium cost.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Protective Put",
            legs=[
                OptionLeg(OptionType.PUT, PositionType.LONG, "OTM_5%"),
            ],
            stock_leg=StockLeg(PositionType.LONG, 100),
            description="Own stock, buy put for downside protection.",
            max_profit="Unlimited upside - Premium",
            max_loss="Stock Price - Strike + Premium",
            breakeven="Stock Price + Premium",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K, P = strikes[0], premiums[0]
        if entry_stock_price is None:
            entry_stock_price = spot_price

        stock_pnl = spot_price - entry_stock_price
        put_payoff = max(K - spot_price, 0) - P
        return stock_pnl + put_payoff

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return float("inf")

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        if entry_stock_price is None:
            return premiums[0]
        return entry_stock_price - strikes[0] + premiums[0]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        if entry_stock_price is None:
            return []
        return [entry_stock_price + premiums[0]]


class Collar(BaseStrategy):
    """
    Collar - Limited risk/reward

    Own stock, buy put, sell call. Limits both risk and reward.
    Good for protecting gains while allowing some upside.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Collar",
            legs=[
                OptionLeg(OptionType.PUT, PositionType.LONG, "OTM_5%"),
                OptionLeg(OptionType.CALL, PositionType.SHORT, "OTM_5%"),
            ],
            stock_leg=StockLeg(PositionType.LONG, 100),
            description="Own stock, buy put, sell call. Limits both risk and reward.",
            max_profit="Call Strike - Stock Price + Net Credit/Debit",
            max_loss="Stock Price - Put Strike + Net Credit/Debit",
            breakeven="Stock Price +/- Net Credit/Debit",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K_put, K_call = strikes[0], strikes[1]  # K_put < K_call
        net_cost = premiums[0] - premiums[1]  # Put premium - Call premium

        if entry_stock_price is None:
            entry_stock_price = spot_price

        stock_pnl = spot_price - entry_stock_price
        put_payoff = max(K_put - spot_price, 0)
        call_liability = max(spot_price - K_call, 0)

        return stock_pnl + put_payoff - call_liability - net_cost

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        if entry_stock_price is None:
            # Estimate based on 5% OTM call
            entry_stock_price = strikes[1] * 0.95
        net_cost = premiums[0] - premiums[1]
        return strikes[1] - entry_stock_price - net_cost

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        if entry_stock_price is None:
            # Estimate based on 5% OTM put
            entry_stock_price = strikes[0] * 1.05
        net_cost = premiums[0] - premiums[1]
        return entry_stock_price - strikes[0] + net_cost

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        if entry_stock_price is None:
            return []
        net_cost = premiums[0] - premiums[1]
        return [entry_stock_price + net_cost]
