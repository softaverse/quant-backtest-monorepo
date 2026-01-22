export interface SavedPortfolio {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  tickers: string[];
  weights: number[];
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
}

export interface PortfolioCreate {
  name: string;
  description?: string;
  tickers: string[];
  weights: number[];
  is_favorite?: boolean;
}

export interface PortfolioUpdate {
  name?: string;
  description?: string;
  tickers?: string[];
  weights?: number[];
  is_favorite?: boolean;
}

export interface PortfolioListResponse {
  portfolios: SavedPortfolio[];
  total: number;
}
