/**
 * Options Backtest API Functions
 */

import type {
  OptionsBacktestRequest,
  OptionsBacktestResponse,
  StrategyInfo,
  OptionChainData,
  ExpirationsData,
} from "@/types/options";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getApiUrl = (path: string) => {
  if (API_BASE_URL.includes("/api")) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/api/v1${path}`;
};

/**
 * Run options strategy backtest
 */
export async function runOptionsBacktest(
  request: OptionsBacktestRequest
): Promise<OptionsBacktestResponse> {
  const response = await fetch(getApiUrl("/options/backtest"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Options backtest failed");
  }

  return response.json();
}

/**
 * Get all available strategies
 */
export async function getStrategies(): Promise<StrategyInfo[]> {
  const response = await fetch(getApiUrl("/options/strategies"), {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch strategies");
  }

  return response.json();
}

/**
 * Get option chain for a ticker
 */
export async function getOptionChain(
  ticker: string,
  expiration?: string
): Promise<OptionChainData> {
  const url = expiration
    ? getApiUrl(`/options/chain/${ticker}?expiration=${expiration}`)
    : getApiUrl(`/options/chain/${ticker}`);

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch option chain");
  }

  return response.json();
}

/**
 * Get available expiration dates for a ticker
 */
export async function getExpirations(ticker: string): Promise<ExpirationsData> {
  const response = await fetch(getApiUrl(`/options/expirations/${ticker}`), {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch expirations");
  }

  return response.json();
}

/**
 * Validate ticker for options trading
 */
export async function validateOptionsTicker(
  ticker: string
): Promise<{
  valid: boolean;
  ticker: string;
  has_options: boolean;
  expirations_count?: number;
  underlying_price?: number;
  name?: string;
  error?: string;
}> {
  const response = await fetch(getApiUrl(`/options/validate-ticker?ticker=${ticker}`), {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    return {
      valid: false,
      ticker,
      has_options: false,
      error: "Validation failed",
    };
  }

  return response.json();
}

/**
 * Get current risk-free rate
 */
export async function getRiskFreeRate(): Promise<{
  risk_free_rate: number;
  percentage: number;
}> {
  const response = await fetch(getApiUrl("/options/risk-free-rate"), {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch risk-free rate");
  }

  return response.json();
}
