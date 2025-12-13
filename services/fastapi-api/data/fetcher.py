"""
股價數據獲取模組
使用 yfinance 獲取歷史股價數據
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta


def fetch_stock_data(
    tickers: list[str],
    start_date: str,
    end_date: str,
) -> pd.DataFrame:
    """
    從 yfinance 獲取多檔股票的歷史收盤價

    Args:
        tickers: 股票代碼列表 (e.g., ["AAPL", "GOOGL", "MSFT"])
        start_date: 開始日期 (YYYY-MM-DD)
        end_date: 結束日期 (YYYY-MM-DD)

    Returns:
        包含各股票收盤價的 DataFrame
    """
    data = yf.download(
        tickers=tickers,
        start=start_date,
        end=end_date,
        interval="1d",
        auto_adjust=True,
        progress=False,
    )

    # 如果只有一檔股票，yfinance 返回的格式不同
    if len(tickers) == 1:
        close_prices = data["Close"].to_frame(name=tickers[0])
    else:
        close_prices = data["Close"]

    # 處理缺失值
    close_prices = close_prices.ffill().dropna()

    return close_prices


def validate_tickers(tickers: list[str]) -> dict[str, bool]:
    """
    驗證股票代碼是否有效

    Args:
        tickers: 股票代碼列表

    Returns:
        各股票代碼的有效性
    """
    results = {}
    for ticker in tickers:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            results[ticker] = info.get("regularMarketPrice") is not None
        except Exception:
            results[ticker] = False
    return results
