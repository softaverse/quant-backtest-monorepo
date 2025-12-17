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
  tickers: [{ ticker: "", weight: 100 }],
});

export function BacktestForm({ onSubmit, loading = false }: BacktestFormProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([
    {
      name: "Portfolio 1",
      tickers: [
        { ticker: "AAPL", weight: 40 },
        { ticker: "GOOGL", weight: 30 },
        { ticker: "MSFT", weight: 30 },
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

  // 自動平衡比例功能
  const balanceWeights = (portfolioIndex: number, mode: "equal" | "fill" | "proportional") => {
    const updated = [...portfolios];
    const tickers = updated[portfolioIndex].tickers;
    const count = tickers.length;

    if (count === 0) return;

    if (mode === "equal") {
      // 全部平均分配
      const equalWeight = 100 / count;
      tickers.forEach((t) => (t.weight = Math.round(equalWeight * 10) / 10));
      // 修正最後一個以確保總和為 100
      const sum = tickers.slice(0, -1).reduce((acc, t) => acc + t.weight, 0);
      tickers[count - 1].weight = Math.round((100 - sum) * 10) / 10;
    } else if (mode === "fill") {
      // 補齊剩下的比例（平均分配給所有股票）
      const currentTotal = tickers.reduce((sum, t) => sum + t.weight, 0);
      const remaining = 100 - currentTotal;
      if (remaining > 0) {
        const addEach = remaining / count;
        tickers.forEach((t) => (t.weight = Math.round((t.weight + addEach) * 10) / 10));
        // 修正最後一個以確保總和為 100
        const sum = tickers.slice(0, -1).reduce((acc, t) => acc + t.weight, 0);
        tickers[count - 1].weight = Math.round((100 - sum) * 10) / 10;
      }
    } else if (mode === "proportional") {
      // 根據現有比例分配補完剩下的比例
      const currentTotal = tickers.reduce((sum, t) => sum + t.weight, 0);
      if (currentTotal > 0 && currentTotal < 100) {
        const scale = 100 / currentTotal;
        tickers.forEach((t) => (t.weight = Math.round(t.weight * scale * 10) / 10));
        // 修正最後一個以確保總和為 100
        const sum = tickers.slice(0, -1).reduce((acc, t) => acc + t.weight, 0);
        tickers[count - 1].weight = Math.round((100 - sum) * 10) / 10;
      } else if (currentTotal === 0) {
        // 如果全部是 0，則平均分配
        const equalWeight = 100 / count;
        tickers.forEach((t) => (t.weight = Math.round(equalWeight * 10) / 10));
        const sum = tickers.slice(0, -1).reduce((acc, t) => acc + t.weight, 0);
        tickers[count - 1].weight = Math.round((100 - sum) * 10) / 10;
      }
    }

    setPortfolios(updated);
  };

  // 驗證
  const getPortfolioWeight = (portfolio: Portfolio) =>
    portfolio.tickers.reduce((sum, t) => sum + t.weight, 0);

  const isValidPortfolio = (portfolio: Portfolio) =>
    Math.abs(getPortfolioWeight(portfolio) - 100) < 1 &&
    portfolio.tickers.every((t) => t.ticker.trim() !== "");

  const allValid = portfolios.every(isValidPortfolio);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;

    const startDate = `${startYear}-01-01`;
    const endDate = getTodayDate();

    // 轉換權重從 0-100 到 0-1 給後端
    const normalizedPortfolios = portfolios.map((p) => ({
      ...p,
      tickers: p.tickers.map((t) => ({
        ...t,
        weight: t.weight / 100,
      })),
    }));

    onSubmit({ portfolios: normalizedPortfolios, startDate, endDate, initialCapital });
  };

  return (
    <Card title="Backtest Configuration">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Backtest Settings */}
        <div className="space-y-4">
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
        </div>

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
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: PORTFOLIO_COLORS[pIndex] }}
                />
                <Input
                  value={portfolio.name}
                  onChange={(e) => updatePortfolioName(pIndex, e.target.value)}
                  className="font-medium flex-1"
                />
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

              {/* Tickers - 由上往下排版 */}
              <div className="space-y-3">
                {portfolio.tickers.map((item, tIndex) => (
                  <div key={tIndex} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Ticker (e.g. AAPL)"
                        value={item.ticker}
                        onChange={(e) =>
                          updateTicker(pIndex, tIndex, "ticker", e.target.value)
                        }
                        className="flex-1"
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
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 w-16">Weight:</label>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          placeholder="%"
                          value={item.weight}
                          onChange={(e) =>
                            updateTicker(pIndex, tIndex, "weight", e.target.value)
                          }
                          className="w-full pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Stock Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTicker(pIndex)}
                disabled={portfolio.tickers.length >= 50}
                className="w-full mt-3"
              >
                + Add Stock
              </Button>

              {/* Weight Status & Auto Balance */}
              <div className="mt-3 space-y-2">
                <p
                  className={`text-sm ${
                    isValid ? "text-green-600" : "text-red-600"
                  }`}
                >
                  Total Weight: {totalWeight.toFixed(1)}%
                  {!isValid && " (must equal 100%)"}
                </p>

                {/* Auto Balance Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => balanceWeights(pIndex, "equal")}
                    title="平均分配所有股票"
                  >
                    平均
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => balanceWeights(pIndex, "fill")}
                    title="將剩餘比例平均分配給所有股票"
                    disabled={totalWeight >= 100}
                  >
                    補齊
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => balanceWeights(pIndex, "proportional")}
                    title="按現有比例放大至 100%"
                    disabled={totalWeight === 0 || totalWeight >= 100}
                  >
                    等比放大
                  </Button>
                </div>
              </div>
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
