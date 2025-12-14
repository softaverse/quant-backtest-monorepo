/**
 * Options Backtest Types
 */

// Strategy types
export type StrategyType =
  | "long_call"
  | "long_put"
  | "short_call"
  | "short_put"
  | "bull_call_spread"
  | "bear_put_spread"
  | "straddle"
  | "strangle"
  | "iron_condor"
  | "iron_butterfly"
  | "butterfly_spread"
  | "covered_call"
  | "protective_put"
  | "collar";

export type VolatilityModel = "historical" | "fixed";

// Request types
export interface LegConfig {
  strike_selection: string;
}

export interface OptionsBacktestRequest {
  ticker: string;
  strategy_type: StrategyType;
  start_date: string;
  end_date: string;
  initial_capital?: number;
  days_to_expiration?: number;
  position_size?: number;
  leg_configs?: Record<string, LegConfig>;
  volatility_model?: VolatilityModel;
  fixed_volatility?: number;
}

// Response types
export interface DailyPnLPoint {
  date: string;
  spot_price: number;
  position_value: number;
  daily_pnl: number;
  dte: number;
}

export interface GreeksPoint {
  date: string;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface PayoffPoint {
  price: number;
  payoff: number;
}

export interface TradeRecord {
  date: string;
  action: string;
  strategy: string;
  strikes: number[];
  spot_price: number;
  net_premium?: number;
  final_pnl?: number;
  premiums?: number[];
  final_premiums?: number[];
}

export interface OptionsStats {
  initial_capital: number;
  final_value: number;
  total_pnl: number;
  total_return: number;
  max_profit: number;
  max_loss: number;
  max_drawdown: number;
  win_rate: number;
  strategy: string;
  days_held: number;
  entry_date: string;
  exit_date: string;
  breakeven_points: number[];
}

export interface OptionsBacktestResponse {
  stats: OptionsStats;
  daily_pnl: DailyPnLPoint[];
  greeks_series: GreeksPoint[];
  payoff_diagram: PayoffPoint[];
  trades: TradeRecord[];
}

// Strategy info
export interface StrategyInfo {
  name: string;
  type: StrategyType;
  legs: number;
  description: string;
  max_profit: string | null;
  max_loss: string | null;
  has_stock_leg: boolean;
}

// Option chain
export interface OptionChainData {
  ticker: string;
  expiration: string;
  underlying_price: number;
  calls: Record<string, unknown>[];
  puts: Record<string, unknown>[];
}

// Expirations
export interface ExpirationsData {
  ticker: string;
  expirations: string[];
}

// Form data
export interface OptionsBacktestFormData {
  ticker: string;
  strategyType: StrategyType;
  startDate: string;
  endDate: string;
  initialCapital: number;
  daysToExpiration: number;
  positionSize: number;
  volatilityModel: VolatilityModel;
  fixedVolatility?: number;
  legConfigs: Record<string, { strike_selection: string }>;
}

// Strategy categories for UI
export const STRATEGY_CATEGORIES = {
  single: ["long_call", "long_put", "short_call", "short_put"] as StrategyType[],
  spreads: [
    "bull_call_spread",
    "bear_put_spread",
    "straddle",
    "strangle",
  ] as StrategyType[],
  complex: [
    "iron_condor",
    "iron_butterfly",
    "butterfly_spread",
  ] as StrategyType[],
  stock: ["covered_call", "protective_put", "collar"] as StrategyType[],
};

// Strategy display names
export const STRATEGY_DISPLAY_NAMES: Record<StrategyType, string> = {
  long_call: "Long Call",
  long_put: "Long Put",
  short_call: "Short Call",
  short_put: "Short Put",
  bull_call_spread: "Bull Call Spread",
  bear_put_spread: "Bear Put Spread",
  straddle: "Long Straddle",
  strangle: "Long Strangle",
  iron_condor: "Iron Condor",
  iron_butterfly: "Iron Butterfly",
  butterfly_spread: "Butterfly Spread",
  covered_call: "Covered Call",
  protective_put: "Protective Put",
  collar: "Collar",
};
