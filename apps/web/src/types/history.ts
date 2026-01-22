import type {
  BacktestResponse,
  PortfolioStats,
  EquityCurvePoint,
  StockStats,
  DateRange,
  BenchmarkStats,
} from "./backtest";

export interface HistorySummary {
  id: number;
  user_id: number;
  portfolio_id: number | null;
  portfolio_name: string | null;
  tickers: string[];
  weights: number[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  rebalance_frequency: string;
  final_value: number | null;
  total_return: number | null;
  cagr: number | null;
  max_drawdown: number | null;
  sharpe_ratio: number | null;
  created_at: string;
}

export interface HistoryEntry extends HistorySummary {
  full_results: BacktestResponse | null;
}

export interface HistoryListResponse {
  history: HistorySummary[];
  total: number;
}

export interface RunAndSaveRequest {
  tickers: string[];
  weights: number[];
  start_date: string;
  end_date: string;
  initial_capital?: number;
  rebalance_frequency?: string;
  portfolio_name?: string;
  portfolio_id?: number;
  save_to_history?: boolean;
}

export interface RunAndSaveResponse {
  history_id: number | null;
  stats: PortfolioStats;
  equity_curve: EquityCurvePoint[];
  individual_stats: Record<string, StockStats>;
  date_range: DateRange;
  benchmark_curve: EquityCurvePoint[];
  benchmark_stats: BenchmarkStats;
}
