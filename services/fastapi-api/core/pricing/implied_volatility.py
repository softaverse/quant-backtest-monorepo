"""
Implied Volatility Calculation
Newton-Raphson and Bisection methods
"""

import numpy as np
from scipy.stats import norm
from typing import Literal, Optional

from .black_scholes import black_scholes_price


def implied_volatility_newton(
    market_price: float,
    S: float,
    K: float,
    T: float,
    r: float,
    option_type: Literal["call", "put"],
    initial_guess: float = 0.3,
    tolerance: float = 1e-6,
    max_iterations: int = 100,
) -> Optional[float]:
    """
    Calculate implied volatility using Newton-Raphson method

    IV is the sigma that satisfies: BS(S, K, T, r, sigma) = market_price

    Newton-Raphson: sigma_new = sigma - (BS - market_price) / vega

    Args:
        market_price: Observed market price of the option
        S: Current stock price
        K: Strike price
        T: Time to expiration (in years)
        r: Risk-free rate
        option_type: "call" or "put"
        initial_guess: Starting volatility guess
        tolerance: Convergence tolerance
        max_iterations: Maximum iterations

    Returns:
        Implied volatility or None if not converged
    """
    if T <= 0:
        return None

    # Check for intrinsic value violations
    if option_type == "call":
        intrinsic = max(S - K * np.exp(-r * T), 0)
    else:
        intrinsic = max(K * np.exp(-r * T) - S, 0)

    if market_price < intrinsic:
        return None  # Price below intrinsic value

    sigma = initial_guess

    for _ in range(max_iterations):
        sqrt_T = np.sqrt(T)
        d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * sqrt_T)
        d2 = d1 - sigma * sqrt_T

        if option_type == "call":
            price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:
            price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

        vega = S * norm.pdf(d1) * sqrt_T

        if vega < 1e-10:
            return None  # Vega too small, can't converge

        diff = price - market_price

        if abs(diff) < tolerance:
            return sigma

        sigma = sigma - diff / vega

        # Ensure sigma stays positive and reasonable
        if sigma <= 0:
            sigma = 0.01
        elif sigma > 10:
            sigma = 10

    return None  # Did not converge


def implied_volatility_bisection(
    market_price: float,
    S: float,
    K: float,
    T: float,
    r: float,
    option_type: Literal["call", "put"],
    tolerance: float = 1e-6,
    max_iterations: int = 100,
) -> Optional[float]:
    """
    Calculate implied volatility using bisection method
    More robust but slower than Newton-Raphson

    Args:
        market_price: Observed market price of the option
        S: Current stock price
        K: Strike price
        T: Time to expiration (in years)
        r: Risk-free rate
        option_type: "call" or "put"
        tolerance: Convergence tolerance
        max_iterations: Maximum iterations

    Returns:
        Implied volatility or None if not found
    """
    if T <= 0:
        return None

    sigma_low = 0.001
    sigma_high = 5.0

    # Check boundaries
    price_low = black_scholes_price(S, K, T, r, sigma_low, option_type).price
    price_high = black_scholes_price(S, K, T, r, sigma_high, option_type).price

    if market_price < price_low or market_price > price_high:
        return None  # Price outside range

    for _ in range(max_iterations):
        sigma_mid = (sigma_low + sigma_high) / 2

        price_result = black_scholes_price(S, K, T, r, sigma_mid, option_type)
        price = price_result.price

        if abs(price - market_price) < tolerance:
            return sigma_mid

        if price > market_price:
            sigma_high = sigma_mid
        else:
            sigma_low = sigma_mid

    return (sigma_low + sigma_high) / 2  # Return best estimate


def calculate_historical_volatility(
    prices: np.ndarray,
    window: int = 20,
    annualization_factor: int = 252,
) -> np.ndarray:
    """
    Calculate rolling historical volatility from price series

    HV = std(log_returns) * sqrt(annualization_factor)

    Args:
        prices: Array of prices
        window: Rolling window size (default 20 trading days)
        annualization_factor: Trading days per year (default 252)

    Returns:
        Array of historical volatility values (NaN for insufficient data)
    """
    prices = np.asarray(prices, dtype=np.float64)

    if len(prices) < 2:
        return np.full(len(prices), np.nan)

    # Calculate log returns
    log_returns = np.log(prices[1:] / prices[:-1])

    # Initialize volatility array
    hv = np.full(len(prices), np.nan)

    # Calculate rolling standard deviation
    for i in range(window, len(prices)):
        window_returns = log_returns[i - window : i]
        hv[i] = np.std(window_returns, ddof=1) * np.sqrt(annualization_factor)

    return hv


def calculate_historical_volatility_series(
    prices: np.ndarray,
    window: int = 20,
    annualization_factor: int = 252,
    fill_method: str = "ffill",
) -> np.ndarray:
    """
    Calculate historical volatility with NaN filling

    Args:
        prices: Array of prices
        window: Rolling window size
        annualization_factor: Trading days per year
        fill_method: How to fill NaN values ("ffill", "bfill", "mean")

    Returns:
        Array of historical volatility values with NaN filled
    """
    hv = calculate_historical_volatility(prices, window, annualization_factor)

    if fill_method == "ffill":
        # Forward fill, then backward fill for leading NaNs
        mask = np.isnan(hv)
        idx = np.where(~mask, np.arange(len(hv)), 0)
        np.maximum.accumulate(idx, out=idx)
        hv = hv[idx]
        # Fill remaining leading NaNs with first valid value
        first_valid_idx = np.argmax(~np.isnan(hv))
        hv[:first_valid_idx] = hv[first_valid_idx] if first_valid_idx < len(hv) else 0.3
    elif fill_method == "bfill":
        # Backward fill
        mask = np.isnan(hv)
        idx = np.where(~mask, np.arange(len(hv)), len(hv) - 1)
        idx = np.minimum.accumulate(idx[::-1])[::-1]
        hv = hv[idx]
    elif fill_method == "mean":
        # Fill with mean of valid values
        valid_mean = np.nanmean(hv) if np.any(~np.isnan(hv)) else 0.3
        hv = np.where(np.isnan(hv), valid_mean, hv)

    return hv
