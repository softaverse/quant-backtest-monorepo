"""
Options Strategies Module
Defines all supported options strategies
"""

from .base import (
    BaseStrategy,
    StrategyDefinition,
    OptionLeg,
    StockLeg,
    OptionType,
    PositionType,
)
from .single_leg import LongCall, LongPut, ShortCall, ShortPut
from .spreads import BullCallSpread, BearPutSpread, Straddle, Strangle
from .multi_leg import (
    IronCondor,
    IronButterfly,
    ButterflySpread,
    CoveredCall,
    ProtectivePut,
    Collar,
)

# Strategy registry for easy lookup
STRATEGY_REGISTRY: dict[str, type[BaseStrategy]] = {
    "long_call": LongCall,
    "long_put": LongPut,
    "short_call": ShortCall,
    "short_put": ShortPut,
    "bull_call_spread": BullCallSpread,
    "bear_put_spread": BearPutSpread,
    "straddle": Straddle,
    "strangle": Strangle,
    "iron_condor": IronCondor,
    "iron_butterfly": IronButterfly,
    "butterfly_spread": ButterflySpread,
    "covered_call": CoveredCall,
    "protective_put": ProtectivePut,
    "collar": Collar,
}


def get_strategy(strategy_type: str) -> BaseStrategy:
    """Get strategy instance by type name"""
    if strategy_type not in STRATEGY_REGISTRY:
        raise ValueError(f"Unknown strategy: {strategy_type}")
    return STRATEGY_REGISTRY[strategy_type]()


def list_strategies() -> list[str]:
    """List all available strategy types"""
    return list(STRATEGY_REGISTRY.keys())


__all__ = [
    # Base classes
    "BaseStrategy",
    "StrategyDefinition",
    "OptionLeg",
    "StockLeg",
    "OptionType",
    "PositionType",
    # Single leg strategies
    "LongCall",
    "LongPut",
    "ShortCall",
    "ShortPut",
    # Spread strategies
    "BullCallSpread",
    "BearPutSpread",
    "Straddle",
    "Strangle",
    # Multi-leg strategies
    "IronCondor",
    "IronButterfly",
    "ButterflySpread",
    "CoveredCall",
    "ProtectivePut",
    "Collar",
    # Utility functions
    "get_strategy",
    "list_strategies",
    "STRATEGY_REGISTRY",
]
