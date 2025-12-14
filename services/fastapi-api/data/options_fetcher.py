"""
Options Data Fetcher
Fetch option chain and historical data using yfinance
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Optional
from dataclasses import dataclass


@dataclass
class OptionChainData:
    """Option chain data for a specific expiration"""

    ticker: str
    expiration: str
    calls: pd.DataFrame
    puts: pd.DataFrame
    underlying_price: float


def fetch_option_chain(
    ticker: str, expiration: Optional[str] = None
) -> OptionChainData:
    """
    Fetch option chain from yfinance

    Args:
        ticker: Stock symbol
        expiration: Expiration date (YYYY-MM-DD). If None, uses nearest expiration.

    Returns:
        OptionChainData with calls and puts DataFrames

    Raises:
        ValueError: If no options available or ticker invalid
    """
    stock = yf.Ticker(ticker)

    # Get available expirations
    try:
        expirations = stock.options
    except Exception as e:
        raise ValueError(f"Failed to fetch options for {ticker}: {str(e)}")

    if not expirations:
        raise ValueError(f"No options available for {ticker}")

    # Select expiration
    if expiration is None:
        expiration = expirations[0]  # Nearest expiration
    elif expiration not in expirations:
        # Find closest expiration
        target = datetime.strptime(expiration, "%Y-%m-%d")
        closest = min(
            expirations, key=lambda x: abs(datetime.strptime(x, "%Y-%m-%d") - target)
        )
        expiration = closest

    # Fetch option chain
    chain = stock.option_chain(expiration)

    # Get underlying price
    info = stock.info
    underlying_price = info.get("regularMarketPrice") or info.get(
        "previousClose", 0
    )

    return OptionChainData(
        ticker=ticker,
        expiration=expiration,
        calls=chain.calls,
        puts=chain.puts,
        underlying_price=underlying_price,
    )


def get_available_expirations(ticker: str) -> list[str]:
    """
    Get list of available expiration dates

    Args:
        ticker: Stock symbol

    Returns:
        List of expiration dates in YYYY-MM-DD format
    """
    stock = yf.Ticker(ticker)
    try:
        return list(stock.options)
    except Exception:
        return []


def fetch_historical_data_for_options(
    ticker: str,
    start_date: str,
    end_date: str,
) -> tuple[pd.DataFrame, pd.Series]:
    """
    Fetch historical stock data and calculate historical volatility

    Args:
        ticker: Stock symbol
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        Tuple of (price_data DataFrame, historical_volatility Series)

    Raises:
        ValueError: If no data available
    """
    stock = yf.Ticker(ticker)

    # Fetch daily data
    hist = stock.history(start=start_date, end=end_date, interval="1d")

    if hist.empty:
        raise ValueError(f"No historical data for {ticker}")

    # Calculate historical volatility (20-day rolling)
    log_returns = np.log(hist["Close"] / hist["Close"].shift(1))
    hv = log_returns.rolling(window=20).std() * np.sqrt(252)

    # Forward fill NaN values in volatility
    hv = hv.ffill().bfill()

    # Set default volatility if all NaN
    if hv.isna().all():
        hv = pd.Series(0.3, index=hist.index)

    return hist, hv


def get_risk_free_rate() -> float:
    """
    Get current risk-free rate (using 13-week Treasury rate)

    Returns:
        Risk-free rate as decimal (e.g., 0.045 for 4.5%)
    """
    try:
        treasury = yf.Ticker("^IRX")  # 13-week Treasury Bill
        info = treasury.info
        rate = info.get("regularMarketPrice", 4.5) / 100
        return rate
    except Exception:
        return 0.045  # Default 4.5%


def select_strike_by_delta(
    chain_data: OptionChainData,
    option_type: str,
    target_delta: float,
) -> tuple[float, float]:
    """
    Select strike closest to target delta

    Args:
        chain_data: Option chain data
        option_type: "call" or "put"
        target_delta: Target delta (e.g., 0.5 for ATM call)

    Returns:
        Tuple of (strike, implied_volatility)
    """
    df = chain_data.calls if option_type == "call" else chain_data.puts

    # If delta column exists, use it
    if "delta" in df.columns:
        idx = (df["delta"] - target_delta).abs().idxmin()
        row = df.loc[idx]
        return row["strike"], row.get("impliedVolatility", 0.3)

    # Otherwise, select by moneyness
    S = chain_data.underlying_price
    if option_type == "call":
        if target_delta >= 0.5:  # ITM or ATM
            df_sorted = df[df["strike"] <= S].sort_values("strike", ascending=False)
        else:  # OTM
            df_sorted = df[df["strike"] > S].sort_values("strike")
    else:  # put
        if abs(target_delta) >= 0.5:  # ITM or ATM
            df_sorted = df[df["strike"] >= S].sort_values("strike")
        else:  # OTM
            df_sorted = df[df["strike"] < S].sort_values("strike", ascending=False)

    if df_sorted.empty:
        df_sorted = df.sort_values("strike")

    row = df_sorted.iloc[0]
    return row["strike"], row.get("impliedVolatility", 0.3)


def select_strike_by_percentage(
    chain_data: OptionChainData,
    option_type: str,
    percentage: float,
) -> tuple[float, float]:
    """
    Select strike by percentage from spot

    Args:
        chain_data: Option chain data
        option_type: "call" or "put"
        percentage: Positive for OTM, negative for ITM

    Returns:
        Tuple of (strike, implied_volatility)
    """
    df = chain_data.calls if option_type == "call" else chain_data.puts
    S = chain_data.underlying_price

    if option_type == "call":
        target_strike = S * (1 + percentage / 100)
    else:
        target_strike = S * (1 - percentage / 100)

    # Find closest strike
    if df.empty:
        return target_strike, 0.3

    idx = (df["strike"] - target_strike).abs().idxmin()
    row = df.loc[idx]

    return row["strike"], row.get("impliedVolatility", 0.3)


def calculate_strike_from_selection(
    spot_price: float,
    selection: str,
    option_type: str,
) -> float:
    """
    Calculate strike price from selection string

    Args:
        spot_price: Current underlying price
        selection: Strike selection string (ATM, OTM_5%, ITM_5%, or absolute value)
        option_type: "call" or "put"

    Returns:
        Strike price
    """
    if selection == "ATM":
        return spot_price

    if selection.startswith("OTM_"):
        pct = float(selection.split("_")[1].replace("%", ""))
        if option_type == "call":
            return spot_price * (1 + pct / 100)
        else:
            return spot_price * (1 - pct / 100)

    if selection.startswith("ITM_"):
        pct = float(selection.split("_")[1].replace("%", ""))
        if option_type == "call":
            return spot_price * (1 - pct / 100)
        else:
            return spot_price * (1 + pct / 100)

    # Assume absolute strike value
    try:
        return float(selection)
    except ValueError:
        return spot_price  # Default to ATM


def validate_ticker_for_options(ticker: str) -> dict:
    """
    Validate if a ticker has options available

    Args:
        ticker: Stock symbol

    Returns:
        Dict with validation results
    """
    try:
        stock = yf.Ticker(ticker)
        options = stock.options
        info = stock.info

        return {
            "valid": len(options) > 0,
            "ticker": ticker,
            "has_options": len(options) > 0,
            "expirations_count": len(options),
            "underlying_price": info.get("regularMarketPrice", 0),
            "name": info.get("shortName", ticker),
        }
    except Exception as e:
        return {
            "valid": False,
            "ticker": ticker,
            "has_options": False,
            "error": str(e),
        }
