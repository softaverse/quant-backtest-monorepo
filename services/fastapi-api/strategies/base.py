"""
Base Strategy Class
Foundation for all options strategies
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class OptionType(str, Enum):
    """Option type: call or put"""

    CALL = "call"
    PUT = "put"


class PositionType(str, Enum):
    """Position type: long or short"""

    LONG = "long"
    SHORT = "short"


@dataclass
class OptionLeg:
    """
    Single option leg definition

    Attributes:
        option_type: CALL or PUT
        position_type: LONG or SHORT
        strike_selection: How to select strike ("ATM", "OTM_5%", "ITM_5%", or absolute)
        quantity: Number of contracts for this leg
        strike: Computed at runtime based on strike_selection
        premium: Computed at runtime using pricing model
    """

    option_type: OptionType
    position_type: PositionType
    strike_selection: str = "ATM"
    quantity: int = 1

    # Computed at runtime
    strike: Optional[float] = None
    premium: Optional[float] = None


@dataclass
class StockLeg:
    """
    Stock position for covered strategies

    Attributes:
        position_type: LONG or SHORT
        quantity: Number of shares (typically 100 per contract)
    """

    position_type: PositionType
    quantity: int = 100


@dataclass
class StrategyDefinition:
    """
    Complete strategy definition

    Attributes:
        name: Display name of the strategy
        legs: List of option legs
        stock_leg: Optional stock position
        description: Strategy description
        max_profit: Description of maximum profit
        max_loss: Description of maximum loss
        breakeven: Description of breakeven point(s)
    """

    name: str
    legs: list[OptionLeg]
    stock_leg: Optional[StockLeg] = None
    description: str = ""
    max_profit: Optional[str] = None
    max_loss: Optional[str] = None
    breakeven: Optional[str] = None


class BaseStrategy(ABC):
    """
    Abstract base class for all options strategies

    All strategy implementations must inherit from this class and
    implement the required abstract methods.
    """

    @abstractmethod
    def get_definition(self) -> StrategyDefinition:
        """
        Return strategy definition

        Returns:
            StrategyDefinition with all strategy details
        """
        pass

    @abstractmethod
    def calculate_payoff(
        self,
        spot_price: float,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        """
        Calculate P&L at a given spot price (at expiration)

        Args:
            spot_price: Current/final underlying price
            strikes: List of strike prices for each leg
            premiums: List of premiums paid/received for each leg
            entry_stock_price: Entry price for stock leg (if applicable)

        Returns:
            Net P&L per share (multiply by 100 for per-contract P&L)
        """
        pass

    @abstractmethod
    def get_max_profit(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        """
        Calculate maximum profit potential

        Args:
            strikes: List of strike prices
            premiums: List of premiums
            entry_stock_price: Entry price for stock leg (if applicable)

        Returns:
            Maximum profit (per share) or float('inf') if unlimited
        """
        pass

    @abstractmethod
    def get_max_loss(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> float:
        """
        Calculate maximum loss potential

        Args:
            strikes: List of strike prices
            premiums: List of premiums
            entry_stock_price: Entry price for stock leg (if applicable)

        Returns:
            Maximum loss (per share, as positive number) or float('inf') if unlimited
        """
        pass

    @abstractmethod
    def get_breakeven(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> list[float]:
        """
        Calculate breakeven point(s)

        Args:
            strikes: List of strike prices
            premiums: List of premiums
            entry_stock_price: Entry price for stock leg (if applicable)

        Returns:
            List of breakeven prices
        """
        pass

    def get_risk_reward_ratio(
        self,
        strikes: list[float],
        premiums: list[float],
        entry_stock_price: Optional[float] = None,
    ) -> Optional[float]:
        """
        Calculate risk/reward ratio

        Returns:
            Risk/reward ratio or None if undefined (unlimited profit or loss)
        """
        max_profit = self.get_max_profit(strikes, premiums, entry_stock_price)
        max_loss = self.get_max_loss(strikes, premiums, entry_stock_price)

        if max_profit == float("inf") or max_loss == float("inf"):
            return None

        if max_profit == 0:
            return None

        return max_loss / max_profit

    def is_debit_strategy(self, premiums: list[float]) -> bool:
        """Check if strategy requires net debit (cost to enter)"""
        definition = self.get_definition()
        net = 0
        for i, leg in enumerate(definition.legs):
            if leg.position_type == PositionType.LONG:
                net -= premiums[i] * leg.quantity
            else:
                net += premiums[i] * leg.quantity
        return net < 0

    def get_net_premium(self, premiums: list[float]) -> float:
        """Calculate net premium (negative = debit, positive = credit)"""
        definition = self.get_definition()
        net = 0
        for i, leg in enumerate(definition.legs):
            if leg.position_type == PositionType.LONG:
                net -= premiums[i] * leg.quantity
            else:
                net += premiums[i] * leg.quantity
        return net
