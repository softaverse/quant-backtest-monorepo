"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";

interface TickerWeight {
  ticker: string;
  weight: number;
}

interface Portfolio {
  name: string;
  tickers: TickerWeight[];
}

interface BacktestFormData {
  portfolios: Portfolio[];
  startDate: string;
  endDate: string;
  initialCapital: number;
}

interface BacktestFormProps {
  onSubmit: (data: BacktestFormData) => void;
  loading?: boolean;
}

// 生成年份選項（從 2000 年到今年）
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

// 取得今天日期（格式：YYYY-MM-DD）
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// 組合顏色
const PORTFOLIO_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

const createDefaultPortfolio = (index: number): Portfolio => ({
  name: `Portfolio ${index + 1}`,
  tickers: [{ ticker: "", weight: 1 }],
});

export function BacktestForm({ onSubmit, loading = false }: BacktestFormProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([
    {
      name: "Portfolio 1",
      tickers: [
        { ticker: "AAPL", weight: 0.4 },
        { ticker: "GOOGL", weight: 0.3 },
        { ticker: "MSFT", weight: 0.3 },
      ],
    },
  ]);
  const [startYear, setStartYear] = useState(2020);
  const [initialCapital, setInitialCapital] = useState(100000);

  // 組合操作
  const addPortfolio = () => {
    if (portfolios.length >= 3) return;
    setPortfolios([...portfolios, createDefaultPortfolio(portfolios.length)]);
  };

  const removePortfolio = (portfolioIndex: number) => {
    if (portfolios.length <= 1) return;
    setPortfolios(portfolios.filter((_, i) => i !== portfolioIndex));
  };

  const updatePortfolioName = (portfolioIndex: number, name: string) => {
    const updated = [...portfolios];
    updated[portfolioIndex].name = name;
    setPortfolios(updated);
  };

  // 股票操作
  const addTicker = (portfolioIndex: number) => {
    const updated = [...portfolios];
    if (updated[portfolioIndex].tickers.length >= 50) return;
    updated[portfolioIndex].tickers.push({ ticker: "", weight: 0 });
    setPortfolios(updated);
  };

  const removeTicker = (portfolioIndex: number, tickerIndex: number) => {
    const updated = [...portfolios];
    if (updated[portfolioIndex].tickers.length <= 1) return;
    updated[portfolioIndex].tickers = updated[portfolioIndex].tickers.filter(
      (_, i) => i !== tickerIndex
    );
    setPortfolios(updated);
  };

  const updateTicker = (
    portfolioIndex: number,
    tickerIndex: number,
    field: keyof TickerWeight,
    value: string | number
  ) => {
    const updated = [...portfolios];
    if (field === "ticker") {
      updated[portfolioIndex].tickers[tickerIndex].ticker = (value as string).toUpperCase();
    } else {
      updated[portfolioIndex].tickers[tickerIndex].weight = Number(value);
    }
    setPortfolios(updated);
  };

  // 驗證
  const getPortfolioWeight = (portfolio: Portfolio) =>
    portfolio.tickers.reduce((sum, t) => sum + t.weight, 0);

  const isValidPortfolio = (portfolio: Portfolio) =>
    Math.abs(getPortfolioWeight(portfolio) - 1) < 0.01 &&
    portfolio.tickers.every((t) => t.ticker.trim() !== "");

  const allValid = portfolios.every(isValidPortfolio);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;

    const startDate = `${startYear}-01-01`;
    const endDate = getTodayDate();

    onSubmit({ portfolios, startDate, endDate, initialCapital });
  };

  return (
    <Card title="Backtest Configuration">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Portfolios */}
        {portfolios.map((portfolio, pIndex) => {
          const totalWeight = getPortfolioWeight(portfolio);
          const isValid = isValidPortfolio(portfolio);

          return (
            <div
              key={pIndex}
              className="p-4 rounded-lg border-2"
              style={{ borderColor: PORTFOLIO_COLORS[pIndex] }}
            >
              {/* Portfolio Header */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: PORTFOLIO_COLORS[pIndex] }}
                  />
                  <Input
                    value={portfolio.name}
                    onChange={(e) => updatePortfolioName(pIndex, e.target.value)}
                    className="font-medium w-32"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTicker(pIndex)}
                    disabled={portfolio.tickers.length >= 50}
                  >
                    + Stock
                  </Button>
                  {portfolios.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePortfolio(pIndex)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {/* Tickers */}
              <div className="space-y-2">
                {portfolio.tickers.map((item, tIndex) => (
                  <div key={tIndex} className="flex gap-2 items-center">
                    <Input
                      placeholder="Ticker"
                      value={item.ticker}
                      onChange={(e) =>
                        updateTicker(pIndex, tIndex, "ticker", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="Weight"
                      value={item.weight}
                      onChange={(e) =>
                        updateTicker(pIndex, tIndex, "weight", e.target.value)
                      }
                      className="w-20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTicker(pIndex, tIndex)}
                      disabled={portfolio.tickers.length <= 1}
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>

              {/* Weight Status */}
              <p
                className={`mt-2 text-sm ${
                  isValid ? "text-green-600" : "text-red-600"
                }`}
              >
                Weight: {(totalWeight * 100).toFixed(1)}%
                {!isValid && " (must equal 100%)"}
              </p>
            </div>
          );
        })}

        {/* Add Portfolio Button */}
        {portfolios.length < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPortfolio}
            className="w-full"
          >
            + Add Portfolio ({portfolios.length}/3)
          </Button>
        )}

        {/* Start Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Backtest Start Year
          </label>
          <select
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            End date: Latest trading day (today)
          </p>
        </div>

        {/* Initial Capital */}
        <Input
          label="Initial Capital ($)"
          type="number"
          min="1000"
          step="1000"
          value={initialCapital}
          onChange={(e) => setInitialCapital(Number(e.target.value))}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!allValid || loading}
        >
          Run Backtest {portfolios.length > 1 ? `(${portfolios.length} Portfolios)` : ""}
        </Button>
      </form>
    </Card>
  );
}
