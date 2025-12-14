"""
Options Pricing Module
Black-Scholes model, Greeks calculation, and Implied Volatility
"""

from .black_scholes import (
    black_scholes_price,
    black_scholes_vectorized,
    OptionPrice,
)
from .greeks import (
    calculate_greeks,
    calculate_greeks_vectorized,
    Greeks,
)
from .implied_volatility import (
    implied_volatility_newton,
    implied_volatility_bisection,
    calculate_historical_volatility,
)

__all__ = [
    # Black-Scholes
    "black_scholes_price",
    "black_scholes_vectorized",
    "OptionPrice",
    # Greeks
    "calculate_greeks",
    "calculate_greeks_vectorized",
    "Greeks",
    # Implied Volatility
    "implied_volatility_newton",
    "implied_volatility_bisection",
    "calculate_historical_volatility",
]
