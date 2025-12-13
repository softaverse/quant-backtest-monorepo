/**
 * 共享類型定義
 * 前後端共用的介面與類型
 */

// 回測請求參數
export interface BacktestRequest {
  tickers: string[];
  weights: number[];
  start_date: string;
  end_date: string;
  initial_capital?: number;
  rebalance_frequency?: "yearly";
}

// 淨值曲線數據點
export interface EquityCurvePoint {
  date: string;
  value: number;
}

// 個股統計
export interface StockStats {
  weight: number;
  total_return: number;
  cagr: number;
}

// 組合統計
export interface PortfolioStats {
  initial_capital: number;
  final_value: number;
  cagr: number;
  max_drawdown: number;
  annualized_volatility: number;
  total_return: number;
}

// 回測結果
export interface BacktestResponse {
  stats: PortfolioStats;
  equity_curve: EquityCurvePoint[];
  individual_stats: Record<string, StockStats>;
}

// 股票驗證結果
export interface ValidateTickersResponse {
  results: Record<string, boolean>;
}
