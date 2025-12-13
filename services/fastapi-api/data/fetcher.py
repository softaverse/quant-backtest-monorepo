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
) -> tuple[pd.DataFrame, str, str]:
    """
    從 yfinance 獲取多檔股票的歷史收盤價

    Args:
        tickers: 股票代碼列表 (e.g., ["AAPL", "GOOGL", "MSFT"])
        start_date: 開始日期 (YYYY-MM-DD)
        end_date: 結束日期 (YYYY-MM-DD)

    Returns:
        (DataFrame, 實際開始日期, 實際結束日期)
    """
    data = yf.download(
        tickers=tickers,
        start=start_date,
        end=end_date,
        interval="1d",
        auto_adjust=True,
        progress=False,
    )

    # 處理空數據的情況
    if data.empty:
        raise ValueError("No data returned from yfinance")

    # 處理 MultiIndex 列（新版 yfinance 的格式）
    if isinstance(data.columns, pd.MultiIndex):
        # 新版 yfinance 返回 MultiIndex: ('Close', 'AAPL'), ('Close', 'GOOGL'), ...
        close_prices = data.xs("Close", axis=1, level=0)
    else:
        # 舊版 yfinance 格式
        close_data = data["Close"]
        if isinstance(close_data, pd.Series):
            close_prices = close_data.to_frame(name=tickers[0])
        else:
            close_prices = close_data

    # 確保列名與請求的 tickers 一致（單一股票的情況）
    if len(tickers) == 1 and len(close_prices.columns) == 1:
        close_prices.columns = tickers

    # 處理缺失值
    close_prices = close_prices.ffill().dropna()

    # 取得實際的交易日期範圍
    actual_start = close_prices.index[0].strftime("%Y-%m-%d") if len(close_prices) > 0 else start_date
    actual_end = close_prices.index[-1].strftime("%Y-%m-%d") if len(close_prices) > 0 else end_date

    return close_prices, actual_start, actual_end


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
