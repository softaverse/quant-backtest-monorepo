import type { BacktestRequest, BacktestResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Docker 環境下使用 /api，本地開發使用完整 URL
const getApiUrl = (path: string) => {
  if (API_BASE_URL.includes("/api")) {
    // Docker 環境：/api/backtest
    return `${API_BASE_URL}${path}`;
  }
  // 本地開發：http://localhost:8000/api/v1/backtest
  return `${API_BASE_URL}/api/v1${path}`;
};

export async function runBacktest(
  request: BacktestRequest
): Promise<BacktestResponse> {
  const response = await fetch(getApiUrl("/backtest"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Backtest failed");
  }

  return response.json();
}

export async function validateTickers(
  tickers: string[]
): Promise<Record<string, boolean>> {
  const response = await fetch(getApiUrl("/validate-tickers"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tickers),
  });

  if (!response.ok) {
    throw new Error("Failed to validate tickers");
  }

  const data = await response.json();
  return data.results;
}
