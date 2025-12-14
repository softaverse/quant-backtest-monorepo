"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { getStrategies } from "@/lib/options-api";
import type {
  StrategyType,
  StrategyInfo,
  VolatilityModel,
  OptionsBacktestFormData,
} from "@/types/options";
import { STRATEGY_CATEGORIES, STRATEGY_DISPLAY_NAMES } from "@/types/options";

interface OptionsBacktestFormProps {
  onSubmit: (data: OptionsBacktestFormData) => void;
  loading?: boolean;
}

const getTodayDate = () => new Date().toISOString().split("T")[0];
const getDefaultStartDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split("T")[0];
};

export function OptionsBacktestForm({
  onSubmit,
  loading = false,
}: OptionsBacktestFormProps) {
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [ticker, setTicker] = useState("AAPL");
  const [strategyType, setStrategyType] = useState<StrategyType>("long_call");
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [initialCapital, setInitialCapital] = useState(10000);
  const [daysToExpiration, setDaysToExpiration] = useState(30);
  const [positionSize, setPositionSize] = useState(1);
  const [volatilityModel, setVolatilityModel] =
    useState<VolatilityModel>("historical");
  const [fixedVolatility, setFixedVolatility] = useState(0.3);

  // Fetch available strategies
  useEffect(() => {
    getStrategies()
      .then(setStrategies)
      .catch((err) => console.error("Failed to fetch strategies:", err));
  }, []);

  const selectedStrategy = strategies.find((s) => s.type === strategyType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      ticker: ticker.toUpperCase(),
      strategyType,
      startDate,
      endDate,
      initialCapital,
      daysToExpiration,
      positionSize,
      volatilityModel,
      fixedVolatility: volatilityModel === "fixed" ? fixedVolatility : undefined,
      legConfigs: {},
    });
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">Options Backtest Configuration</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ticker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Underlying Ticker
          </label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="AAPL"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Strategy Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Strategy
          </label>
          <select
            value={strategyType}
            onChange={(e) => setStrategyType(e.target.value as StrategyType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <optgroup label="Single Leg">
              {STRATEGY_CATEGORIES.single.map((s) => (
                <option key={s} value={s}>
                  {STRATEGY_DISPLAY_NAMES[s]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Spreads">
              {STRATEGY_CATEGORIES.spreads.map((s) => (
                <option key={s} value={s}>
                  {STRATEGY_DISPLAY_NAMES[s]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Complex">
              {STRATEGY_CATEGORIES.complex.map((s) => (
                <option key={s} value={s}>
                  {STRATEGY_DISPLAY_NAMES[s]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Stock + Options">
              {STRATEGY_CATEGORIES.stock.map((s) => (
                <option key={s} value={s}>
                  {STRATEGY_DISPLAY_NAMES[s]}
                </option>
              ))}
            </optgroup>
          </select>

          {selectedStrategy && (
            <p className="mt-2 text-sm text-gray-500">
              {selectedStrategy.description}
            </p>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* DTE & Position Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days to Expiration
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={daysToExpiration}
              onChange={(e) => setDaysToExpiration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contracts
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={positionSize}
              onChange={(e) => setPositionSize(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Initial Capital */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Initial Capital ($)
          </label>
          <input
            type="number"
            min={1000}
            step={1000}
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Volatility Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Volatility Model
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="historical"
                checked={volatilityModel === "historical"}
                onChange={() => setVolatilityModel("historical")}
                className="mr-2"
              />
              Historical (20-day)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="fixed"
                checked={volatilityModel === "fixed"}
                onChange={() => setVolatilityModel("fixed")}
                className="mr-2"
              />
              Fixed
            </label>
          </div>

          {volatilityModel === "fixed" && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fixed Volatility
              </label>
              <input
                type="number"
                step={0.01}
                min={0.01}
                max={2}
                value={fixedVolatility}
                onChange={(e) => setFixedVolatility(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Strategy Info Box */}
        {selectedStrategy && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              {selectedStrategy.name}
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <span className="font-medium">Legs:</span> {selectedStrategy.legs}
              </p>
              <p>
                <span className="font-medium">Max Profit:</span>{" "}
                {selectedStrategy.max_profit || "Variable"}
              </p>
              <p>
                <span className="font-medium">Max Loss:</span>{" "}
                {selectedStrategy.max_loss || "Variable"}
              </p>
              {selectedStrategy.has_stock_leg && (
                <p className="text-blue-600">
                  * Includes stock position
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !ticker}
          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
            loading || !ticker
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Running Backtest..." : "Run Options Backtest"}
        </button>
      </form>
    </Card>
  );
}
