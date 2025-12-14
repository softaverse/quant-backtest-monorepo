"""
Spread Strategies
Vertical spreads, Straddles, Strangles
"""

from typing import Optional

from .base import (
    BaseStrategy,
    StrategyDefinition,
    OptionLeg,
    OptionType,
    PositionType,
)


class BullCallSpread(BaseStrategy):
    """
    Bull Call Spread - Moderately bullish

    Buy a lower strike call, sell a higher strike call.
    Limited profit and limited loss.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Bull Call Spread",
            legs=[
                OptionLeg(OptionType.CALL, PositionType.LONG, "ATM"),
                OptionLeg(OptionType.CALL, PositionType.SHORT, "OTM_5%"),
            ],
            description="Buy lower strike call, sell higher strike call.",
            max_profit="Width - Net Debit",
            max_loss="Net Debit",
            breakeven="Lower Strike + Net Debit",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K1, K2 = strikes[0], strikes[1]  # K1 < K2
        P1, P2 = premiums[0], premiums[1]
        net_debit = P1 - P2
        return max(spot_price - K1, 0) - max(spot_price - K2, 0) - net_debit

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        width = strikes[1] - strikes[0]
        net_debit = premiums[0] - premiums[1]
        return width - net_debit

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return premiums[0] - premiums[1]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        net_debit = premiums[0] - premiums[1]
        return [strikes[0] + net_debit]


class BearPutSpread(BaseStrategy):
    """
    Bear Put Spread - Moderately bearish

    Buy a higher strike put, sell a lower strike put.
    Limited profit and limited loss.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Bear Put Spread",
            legs=[
                OptionLeg(OptionType.PUT, PositionType.LONG, "ATM"),
                OptionLeg(OptionType.PUT, PositionType.SHORT, "OTM_5%"),
            ],
            description="Buy higher strike put, sell lower strike put.",
            max_profit="Width - Net Debit",
            max_loss="Net Debit",
            breakeven="Higher Strike - Net Debit",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K1, K2 = strikes[0], strikes[1]  # K1 > K2 (higher strike put is long)
        P1, P2 = premiums[0], premiums[1]
        net_debit = P1 - P2
        return max(K1 - spot_price, 0) - max(K2 - spot_price, 0) - net_debit

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        width = strikes[0] - strikes[1]
        net_debit = premiums[0] - premiums[1]
        return width - net_debit

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return premiums[0] - premiums[1]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        net_debit = premiums[0] - premiums[1]
        return [strikes[0] - net_debit]


class Straddle(BaseStrategy):
    """
    Long Straddle - Profit from large move either direction

    Buy ATM call and ATM put with same strike and expiration.
    Unlimited profit potential, maximum loss is total premium paid.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Long Straddle",
            legs=[
                OptionLeg(OptionType.CALL, PositionType.LONG, "ATM"),
                OptionLeg(OptionType.PUT, PositionType.LONG, "ATM"),
            ],
            description="Buy ATM call and put. Profit from large price movement.",
            max_profit="Unlimited",
            max_loss="Total premium paid",
            breakeven="Strike +/- Total Premium",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K = strikes[0]  # Both legs have same strike for straddle
        total_premium = premiums[0] + premiums[1]
        call_payoff = max(spot_price - K, 0)
        put_payoff = max(K - spot_price, 0)
        return call_payoff + put_payoff - total_premium

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
        return premiums[0] + premiums[1]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        total = premiums[0] + premiums[1]
        return [strikes[0] - total, strikes[0] + total]


class Strangle(BaseStrategy):
    """
    Long Strangle - Profit from large move, cheaper than straddle

    Buy OTM call and OTM put.
    Unlimited profit potential, lower cost than straddle.
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Long Strangle",
            legs=[
                OptionLeg(OptionType.CALL, PositionType.LONG, "OTM_5%"),
                OptionLeg(OptionType.PUT, PositionType.LONG, "OTM_5%"),
            ],
            description="Buy OTM call and put. Cheaper than straddle.",
            max_profit="Unlimited",
            max_loss="Total premium paid",
            breakeven="Call Strike + Premium / Put Strike - Premium",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K_call, K_put = strikes[0], strikes[1]  # K_call > K_put
        total_premium = premiums[0] + premiums[1]
        call_payoff = max(spot_price - K_call, 0)
        put_payoff = max(K_put - spot_price, 0)
        return call_payoff + put_payoff - total_premium

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
        return premiums[0] + premiums[1]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        total = premiums[0] + premiums[1]
        # Put breakeven is lower, call breakeven is higher
        return [strikes[1] - total, strikes[0] + total]
