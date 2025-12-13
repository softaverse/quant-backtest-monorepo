export interface BacktestRequest {
  tickers: string[];
  weights: number[];
  start_date: string;
  end_date: string;
  initial_capital?: number;
  rebalance_frequency?: "yearly";
}

export interface EquityCurvePoint {
  date: string;
  value: number;
}

export interface StockStats {
  weight: number;
  total_return: number;
  cagr: number;
}

export interface PortfolioStats {
  initial_capital: number;
  final_value: number;
  cagr: number;
  max_drawdown: number;
  annualized_volatility: number;
  total_return: number;
}

export interface BacktestResponse {
  stats: PortfolioStats;
  equity_curve: EquityCurvePoint[];
  individual_stats: Record<string, StockStats>;
}
