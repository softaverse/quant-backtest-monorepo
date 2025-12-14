"""
Single Leg Option Strategies
Long/Short Call/Put
"""

from typing import Optional

from .base import (
    BaseStrategy,
    StrategyDefinition,
    OptionLeg,
    OptionType,
    PositionType,
)


class LongCall(BaseStrategy):
    """
    Long Call - Bullish strategy with unlimited upside

    Buy a call option to profit from price increases.
    Maximum profit: Unlimited
    Maximum loss: Premium paid
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Long Call",
            legs=[
                OptionLeg(
                    option_type=OptionType.CALL,
                    position_type=PositionType.LONG,
                    strike_selection="ATM",
                )
            ],
            description="Buy a call option. Profit from price increase.",
            max_profit="Unlimited",
            max_loss="Premium paid",
            breakeven="Strike + Premium",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K, P = strikes[0], premiums[0]
        return max(spot_price - K, 0) - P

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
        return premiums[0]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        return [strikes[0] + premiums[0]]


class LongPut(BaseStrategy):
    """
    Long Put - Bearish strategy

    Buy a put option to profit from price decreases.
    Maximum profit: Strike - Premium (if stock goes to 0)
    Maximum loss: Premium paid
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Long Put",
            legs=[
                OptionLeg(
                    option_type=OptionType.PUT,
                    position_type=PositionType.LONG,
                    strike_selection="ATM",
                )
            ],
            description="Buy a put option. Profit from price decrease.",
            max_profit="Strike - Premium (if stock goes to 0)",
            max_loss="Premium paid",
            breakeven="Strike - Premium",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K, P = strikes[0], premiums[0]
        return max(K - spot_price, 0) - P

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return strikes[0] - premiums[0]

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return premiums[0]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        return [strikes[0] - premiums[0]]


class ShortCall(BaseStrategy):
    """
    Short Call (Naked Call) - Bearish/Neutral strategy

    Sell a call option to collect premium. High risk if stock rises.
    Maximum profit: Premium received
    Maximum loss: Unlimited
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Short Call",
            legs=[
                OptionLeg(
                    option_type=OptionType.CALL,
                    position_type=PositionType.SHORT,
                    strike_selection="ATM",
                )
            ],
            description="Sell a call option. Profit from time decay or price decrease.",
            max_profit="Premium received",
            max_loss="Unlimited",
            breakeven="Strike + Premium",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K, P = strikes[0], premiums[0]
        return P - max(spot_price - K, 0)

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return premiums[0]

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return float("inf")

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        return [strikes[0] + premiums[0]]


class ShortPut(BaseStrategy):
    """
    Short Put (Naked Put) - Bullish/Neutral strategy

    Sell a put option to collect premium. Risk if stock falls.
    Maximum profit: Premium received
    Maximum loss: Strike - Premium (if stock goes to 0)
    """

    def get_definition(self) -> StrategyDefinition:
        return StrategyDefinition(
            name="Short Put",
            legs=[
                OptionLeg(
                    option_type=OptionType.PUT,
                    position_type=PositionType.SHORT,
                    strike_selection="ATM",
                )
            ],
            description="Sell a put option. Profit from time decay or price increase.",
            max_profit="Premium received",
            max_loss="Strike - Premium (if stock goes to 0)",
            breakeven="Strike - Premium",
        )

    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        K, P = strikes[0], premiums[0]
        return P - max(K - spot_price, 0)

    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return premiums[0]

    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        return strikes[0] - premiums[0]

    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        return [strikes[0] - premiums[0]]
