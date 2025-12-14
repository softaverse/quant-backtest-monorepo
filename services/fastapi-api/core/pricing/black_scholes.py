"""
Black-Scholes Option Pricing Model
European options pricing with analytical solution
"""

import numpy as np
from scipy.stats import norm
from typing import Literal
from dataclasses import dataclass


@dataclass
class OptionPrice:
    """Option pricing result"""

    price: float
    intrinsic_value: float
    time_value: float


def black_scholes_price(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: Literal["call", "put"],
) -> OptionPrice:
    """
    Calculate European option price using Black-Scholes formula

    C = S * N(d1) - K * e^(-rT) * N(d2)
    P = K * e^(-rT) * N(-d2) - S * N(-d1)

    where:
    d1 = [ln(S/K) + (r + sigma^2/2) * T] / (sigma * sqrt(T))
    d2 = d1 - sigma * sqrt(T)

    Args:
        S: Current stock price
        K: Strike price
        T: Time to expiration (in years)
        r: Risk-free rate (annualized)
        sigma: Volatility (annualized)
        option_type: "call" or "put"

    Returns:
        OptionPrice with price, intrinsic_value, and time_value
    """
    if T <= 0:
        # At expiration
        if option_type == "call":
            intrinsic = max(S - K, 0)
        else:
            intrinsic = max(K - S, 0)
        return OptionPrice(price=intrinsic, intrinsic_value=intrinsic, time_value=0)

    if sigma <= 0:
        # Zero volatility - option is worth intrinsic value
        if option_type == "call":
            intrinsic = max(S - K * np.exp(-r * T), 0)
        else:
            intrinsic = max(K * np.exp(-r * T) - S, 0)
        return OptionPrice(price=intrinsic, intrinsic_value=intrinsic, time_value=0)

    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)

    if option_type == "call":
        price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        intrinsic = max(S - K, 0)
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        intrinsic = max(K - S, 0)

    time_value = price - intrinsic

    return OptionPrice(
        price=max(price, 0),
        intrinsic_value=intrinsic,
        time_value=max(time_value, 0),
    )


def black_scholes_vectorized(
    S: np.ndarray,
    K: float,
    T: np.ndarray,
    r: float,
    sigma: np.ndarray,
    option_type: Literal["call", "put"],
) -> np.ndarray:
    """
    Vectorized Black-Scholes for efficient backtesting

    Args:
        S: Stock price array
        K: Strike price (scalar)
        T: Time to expiration array (in years)
        r: Risk-free rate (scalar)
        sigma: Volatility array
        option_type: "call" or "put"

    Returns:
        Array of option prices
    """
    # Ensure inputs are numpy arrays
    S = np.asarray(S, dtype=np.float64)
    T = np.asarray(T, dtype=np.float64)
    sigma = np.asarray(sigma, dtype=np.float64)

    # Handle expired options
    expired_mask = T <= 0

    # Handle zero volatility
    zero_vol_mask = sigma <= 0

    # Safe division for non-expired, non-zero-vol options
    T_safe = np.where(expired_mask | zero_vol_mask, 1, T)
    sigma_safe = np.where(zero_vol_mask, 1, sigma)
    sqrt_T = np.sqrt(T_safe)

    d1 = (np.log(S / K) + (r + 0.5 * sigma_safe**2) * T_safe) / (sigma_safe * sqrt_T)
    d2 = d1 - sigma_safe * sqrt_T

    if option_type == "call":
        prices = S * norm.cdf(d1) - K * np.exp(-r * T_safe) * norm.cdf(d2)
        expired_prices = np.maximum(S - K, 0)
    else:
        prices = K * np.exp(-r * T_safe) * norm.cdf(-d2) - S * norm.cdf(-d1)
        expired_prices = np.maximum(K - S, 0)

    # Apply expired values
    prices = np.where(expired_mask, expired_prices, prices)

    # Handle zero volatility cases
    if option_type == "call":
        zero_vol_prices = np.maximum(S - K * np.exp(-r * T), 0)
    else:
        zero_vol_prices = np.maximum(K * np.exp(-r * T) - S, 0)
    prices = np.where(zero_vol_mask & ~expired_mask, zero_vol_prices, prices)

    return np.maximum(prices, 0)
