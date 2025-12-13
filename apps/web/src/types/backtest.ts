export interface BacktestRequest {
  tickers: string[];
  weights: number[];
  start_date: string;
  end_date: string;
  initial_capital?: number;
  rebalance_frequency?: "yearly";
}

export interface PortfolioInput {
  name: string;
  tickers: string[];
  weights: number[];
}

export interface BatchBacktestRequest {
  portfolios: PortfolioInput[];
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

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface BenchmarkStats {
  initial_capital: number;
  final_value: number;
  total_return: number;
  cagr: number;
  max_drawdown: number;
  annualized_volatility: number;
}

export interface BacktestResponse {
  stats: PortfolioStats;
  equity_curve: EquityCurvePoint[];
  individual_stats: Record<string, StockStats>;
  date_range: DateRange;
  benchmark_curve: EquityCurvePoint[];
  benchmark_stats: BenchmarkStats;
}

export interface PortfolioResult {
  name: string;
  stats: PortfolioStats;
  equity_curve: EquityCurvePoint[];
  individual_stats: Record<string, StockStats>;
}

export interface BatchBacktestResponse {
  portfolios: PortfolioResult[];
  date_range: DateRange;
  benchmark_curve: EquityCurvePoint[];
  benchmark_stats: BenchmarkStats;
}
