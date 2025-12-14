"""
Options Greeks Calculation
Delta, Gamma, Theta, Vega, Rho
"""

import numpy as np
from scipy.stats import norm
from typing import Literal
from dataclasses import dataclass


@dataclass
class Greeks:
    """All Greeks for an option"""

    delta: float  # Rate of change of option price with respect to underlying
    gamma: float  # Rate of change of delta with respect to underlying
    theta: float  # Rate of change of option price with respect to time (per day)
    vega: float  # Rate of change of option price with respect to volatility (per 1%)
    rho: float  # Rate of change of option price with respect to interest rate (per 1%)


def calculate_greeks(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    option_type: Literal["call", "put"],
) -> Greeks:
    """
    Calculate all Greeks for a European option

    Delta = dV/dS
    Gamma = d^2V/dS^2
    Theta = -dV/dT (expressed per day)
    Vega = dV/d(sigma) (expressed per 1% move in IV)
    Rho = dV/dr (expressed per 1% move in rate)

    Args:
        S: Current stock price
        K: Strike price
        T: Time to expiration (in years)
        r: Risk-free rate
        sigma: Volatility
        option_type: "call" or "put"

    Returns:
        Greeks dataclass with all five Greeks
    """
    if T <= 0:
        # At expiration, Greeks are 0 or discontinuous
        if option_type == "call":
            delta = 1.0 if S > K else (0.5 if S == K else 0.0)
        else:
            delta = -1.0 if S < K else (-0.5 if S == K else 0.0)
        return Greeks(delta=delta, gamma=0, theta=0, vega=0, rho=0)

    if sigma <= 0:
        # Zero volatility
        if option_type == "call":
            delta = 1.0 if S > K * np.exp(-r * T) else 0.0
        else:
            delta = -1.0 if S < K * np.exp(-r * T) else 0.0
        return Greeks(delta=delta, gamma=0, theta=0, vega=0, rho=0)

    sqrt_T = np.sqrt(T)
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T

    # Common terms
    N_d1 = norm.cdf(d1)
    N_d2 = norm.cdf(d2)
    n_d1 = norm.pdf(d1)  # Standard normal PDF

    # Gamma (same for call and put)
    gamma = n_d1 / (S * sigma * sqrt_T)

    # Vega (same for call and put, expressed per 1% IV change)
    vega = S * n_d1 * sqrt_T / 100

    if option_type == "call":
        delta = N_d1
        theta = (
            -(S * n_d1 * sigma) / (2 * sqrt_T) - r * K * np.exp(-r * T) * N_d2
        ) / 365  # Per day
        rho = K * T * np.exp(-r * T) * N_d2 / 100  # Per 1%
    else:
        delta = N_d1 - 1
        theta = (
            -(S * n_d1 * sigma) / (2 * sqrt_T) + r * K * np.exp(-r * T) * norm.cdf(-d2)
        ) / 365
        rho = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100

    return Greeks(
        delta=round(delta, 6),
        gamma=round(gamma, 6),
        theta=round(theta, 6),
        vega=round(vega, 6),
        rho=round(rho, 6),
    )


def calculate_greeks_vectorized(
    S: np.ndarray,
    K: float,
    T: np.ndarray,
    r: float,
    sigma: np.ndarray,
    option_type: Literal["call", "put"],
) -> dict[str, np.ndarray]:
    """
    Vectorized Greeks calculation for time series

    Args:
        S: Stock price array
        K: Strike price (scalar)
        T: Time to expiration array (in years)
        r: Risk-free rate (scalar)
        sigma: Volatility array
        option_type: "call" or "put"

    Returns:
        Dict of Greek arrays: {"delta": [...], "gamma": [...], ...}
    """
    # Ensure inputs are numpy arrays
    S = np.asarray(S, dtype=np.float64)
    T = np.asarray(T, dtype=np.float64)
    sigma = np.asarray(sigma, dtype=np.float64)

    # Handle edge cases
    expired_mask = T <= 0
    zero_vol_mask = sigma <= 0

    T_safe = np.maximum(T, 1e-10)
    sigma_safe = np.where(zero_vol_mask, 0.01, sigma)
    sqrt_T = np.sqrt(T_safe)

    d1 = (np.log(S / K) + (r + 0.5 * sigma_safe**2) * T_safe) / (sigma_safe * sqrt_T)
    d2 = d1 - sigma_safe * sqrt_T

    N_d1 = norm.cdf(d1)
    n_d1 = norm.pdf(d1)

    gamma = n_d1 / (S * sigma_safe * sqrt_T)
    vega = S * n_d1 * sqrt_T / 100

    if option_type == "call":
        delta = N_d1
        theta = (
            -(S * n_d1 * sigma_safe) / (2 * sqrt_T)
            - r * K * np.exp(-r * T_safe) * norm.cdf(d2)
        ) / 365
        rho = K * T_safe * np.exp(-r * T_safe) * norm.cdf(d2) / 100
    else:
        delta = N_d1 - 1
        theta = (
            -(S * n_d1 * sigma_safe) / (2 * sqrt_T)
            + r * K * np.exp(-r * T_safe) * norm.cdf(-d2)
        ) / 365
        rho = -K * T_safe * np.exp(-r * T_safe) * norm.cdf(-d2) / 100

    # Zero out Greeks for expired options
    gamma = np.where(expired_mask, 0, gamma)
    theta = np.where(expired_mask, 0, theta)
    vega = np.where(expired_mask, 0, vega)
    rho = np.where(expired_mask, 0, rho)

    # Handle zero volatility
    gamma = np.where(zero_vol_mask, 0, gamma)
    vega = np.where(zero_vol_mask, 0, vega)

    return {
        "delta": delta,
        "gamma": gamma,
        "theta": theta,
        "vega": vega,
        "rho": rho,
    }
