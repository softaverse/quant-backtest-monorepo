"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";

interface TickerWeight {
  ticker: string;
  weight: number;
}

interface BacktestFormData {
  tickers: TickerWeight[];
  startDate: string;
  endDate: string;
  initialCapital: number;
}

interface BacktestFormProps {
  onSubmit: (data: BacktestFormData) => void;
  loading?: boolean;
}

export function BacktestForm({ onSubmit, loading = false }: BacktestFormProps) {
  const [tickers, setTickers] = useState<TickerWeight[]>([
    { ticker: "AAPL", weight: 0.4 },
    { ticker: "GOOGL", weight: 0.3 },
    { ticker: "MSFT", weight: 0.3 },
  ]);
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2024-01-01");
  const [initialCapital, setInitialCapital] = useState(100000);

  const addTicker = () => {
    if (tickers.length >= 50) return;
    setTickers([...tickers, { ticker: "", weight: 0 }]);
  };

  const removeTicker = (index: number) => {
    if (tickers.length <= 1) return;
    setTickers(tickers.filter((_, i) => i !== index));
  };

  const updateTicker = (
    index: number,
    field: keyof TickerWeight,
    value: string | number
  ) => {
    const updated = [...tickers];
    if (field === "ticker") {
      updated[index].ticker = (value as string).toUpperCase();
    } else {
      updated[index].weight = Number(value);
    }
    setTickers(updated);
  };

  const totalWeight = tickers.reduce((sum, t) => sum + t.weight, 0);
  const isValidWeight = Math.abs(totalWeight - 1) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidWeight) return;
    onSubmit({ tickers, startDate, endDate, initialCapital });
  };

  return (
    <Card title="Backtest Configuration">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tickers Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Stocks & Weights
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTicker}
              disabled={tickers.length >= 50}
            >
              + Add Stock
            </Button>
          </div>
          <div className="space-y-2">
            {tickers.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="Ticker (e.g. AAPL)"
                  value={item.ticker}
                  onChange={(e) => updateTicker(index, "ticker", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="Weight"
                  value={item.weight}
                  onChange={(e) => updateTicker(index, "weight", e.target.value)}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeTicker(index)}
                  disabled={tickers.length <= 1}
                >
                  X
                </Button>
              </div>
            ))}
          </div>
          <p
            className={`mt-2 text-sm ${
              isValidWeight ? "text-green-600" : "text-red-600"
            }`}
          >
            Total Weight: {(totalWeight * 100).toFixed(1)}%
            {!isValidWeight && " (must equal 100%)"}
          </p>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
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
          disabled={!isValidWeight || loading}
        >
          Run Backtest
        </Button>
      </form>
    </Card>
  );
}
