"use client";

import { useState, useRef, useEffect } from "react";
import { Button, TickerCombobox } from "@/components/ui";
import { useTickerValidation } from "@/hooks/useTickerValidation";
import { isInStaticList } from "@/data/tickers";

interface Asset {
  ticker: string;
  weights: number[]; // weights[0] = Portfolio #1, weights[1] = Portfolio #2, etc.
}

interface Portfolio {
  name: string;
  tickers: { ticker: string; weight: number }[];
}

interface BacktestFormData {
  portfolios: Portfolio[];
  startDate: string;
  endDate: string;
  initialCapital: number;
}

interface BacktestFormProps {
  onSubmit: (data: BacktestFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const DEFAULT_VISIBLE_ASSETS = 10;
const MAX_ASSETS = 50;

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

// Trash icon component
const TrashIcon = () => (
  <svg
    className="w-5 h-5 text-gray-500 cursor-pointer hover:text-red-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

// Settings/Gear icon component
const SettingsIcon = () => (
  <svg
    className="w-4 h-4 text-gray-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// Dropdown arrow icon
const ChevronDownIcon = () => (
  <svg
    className="w-3 h-3 text-gray-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

const PORTFOLIO_COUNT = 3;

export function BacktestForm({ onSubmit, onCancel, loading = false }: BacktestFormProps) {
  const portfolioCount = PORTFOLIO_COUNT;
  const [assets, setAssets] = useState<Asset[]>([
    { ticker: "VTSMX", weights: [40, 0, 0] },
    { ticker: "VGTSX", weights: [20, 0, 0] },
    { ticker: "VGSIX", weights: [10, 0, 0] },
    { ticker: "VBMFX", weights: [30, 0, 0] },
    { ticker: "", weights: [0, 0, 0] },
    { ticker: "", weights: [0, 0, 0] },
    { ticker: "", weights: [0, 0, 0] },
    { ticker: "", weights: [0, 0, 0] },
    { ticker: "", weights: [0, 0, 0] },
    { ticker: "", weights: [0, 0, 0] },
  ]);
  const [visibleAssets, setVisibleAssets] = useState(DEFAULT_VISIBLE_ASSETS);
  const [startYear, setStartYear] = useState(2020);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Ticker validation hook
  const { validateTicker, getStatus } = useTickerValidation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown !== null) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const updateTicker = (assetIndex: number, value: string) => {
    const updated = [...assets];
    updated[assetIndex].ticker = value.toUpperCase();
    setAssets(updated);

    // Trigger validation for non-static tickers
    if (value && !isInStaticList(value)) {
      validateTicker(value);
    }
  };

  const updateWeight = (assetIndex: number, portfolioIndex: number, value: number) => {
    const updated = [...assets];
    updated[assetIndex].weights[portfolioIndex] = value;
    setAssets(updated);
  };

  const getPortfolioTotal = (portfolioIndex: number) => {
    return assets.reduce((sum, asset) => sum + (asset.weights[portfolioIndex] || 0), 0);
  };

  const clearAllAssets = () => {
    setAssets(assets.map(() => ({ ticker: "", weights: [0, 0, 0] })));
  };

  const showMoreAssets = () => {
    const newCount = Math.min(visibleAssets + 10, MAX_ASSETS);
    if (assets.length < newCount) {
      const newAssets = [...assets];
      for (let i = assets.length; i < newCount; i++) {
        newAssets.push({ ticker: "", weights: [0, 0, 0] });
      }
      setAssets(newAssets);
    }
    setVisibleAssets(newCount);
  };

  // Portfolio dropdown actions
  const handlePortfolioAction = (portfolioIndex: number, action: string) => {
    const updated = [...assets];

    if (action === "clear") {
      updated.forEach((asset) => {
        asset.weights[portfolioIndex] = 0;
      });
    } else if (action === "equal") {
      const assetsWithTickers = updated.filter((a) => a.ticker.trim() !== "");
      const count = assetsWithTickers.length;
      if (count > 0) {
        const equalWeight = Math.floor(100 / count);
        const remainder = 100 - equalWeight * count;
        let remainderAdded = 0;
        updated.forEach((asset) => {
          if (asset.ticker.trim() !== "") {
            asset.weights[portfolioIndex] = equalWeight + (remainderAdded < remainder ? 1 : 0);
            remainderAdded++;
          } else {
            asset.weights[portfolioIndex] = 0;
          }
        });
      }
    } else if (action === "normalize") {
      // Normalize weights to reach 100%
      const currentTotal = updated.reduce(
        (sum, asset) => sum + (asset.weights[portfolioIndex] || 0),
        0
      );
      const remaining = 100 - currentTotal;
      if (remaining > 0) {
        // Distribute remaining weight among assets with tickers
        const assetsWithTickers = updated.filter((a) => a.ticker.trim() !== "");
        const count = assetsWithTickers.length;
        if (count > 0) {
          const addEach = Math.floor(remaining / count);
          const extraRemainder = remaining - addEach * count;
          let extraAdded = 0;
          updated.forEach((asset) => {
            if (asset.ticker.trim() !== "") {
              asset.weights[portfolioIndex] += addEach + (extraAdded < extraRemainder ? 1 : 0);
              extraAdded++;
            }
          });
        }
      }
    } else if (action.startsWith("copy-")) {
      const sourceIndex = parseInt(action.split("-")[1], 10);
      updated.forEach((asset) => {
        asset.weights[portfolioIndex] = asset.weights[sourceIndex];
      });
    }

    setAssets(updated);
    setOpenDropdown(null);
  };

  // Convert assets to portfolio format for submission
  const convertToPortfolios = (): Portfolio[] => {
    const portfolios: Portfolio[] = [];

    for (let pIndex = 0; pIndex < portfolioCount; pIndex++) {
      const tickers: { ticker: string; weight: number }[] = [];

      assets.forEach((asset) => {
        if (asset.ticker.trim() !== "" && asset.weights[pIndex] > 0) {
          tickers.push({
            ticker: asset.ticker,
            weight: asset.weights[pIndex] / 100, // Convert to 0-1 scale
          });
        }
      });

      if (tickers.length > 0) {
        portfolios.push({
          name: `Portfolio #${pIndex + 1}`,
          tickers,
        });
      }
    }

    return portfolios;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const portfolios = convertToPortfolios();
    if (portfolios.length === 0) return;

    const startDate = `${startYear}-01-01`;
    const endDate = getTodayDate();

    onSubmit({ portfolios, startDate, endDate, initialCapital });
  };

  // Validation: at least one portfolio has valid weights (sum to 100)
  const hasValidPortfolio = () => {
    for (let pIndex = 0; pIndex < portfolioCount; pIndex++) {
      const total = getPortfolioTotal(pIndex);
      const hasAssets = assets.some(
        (a) => a.ticker.trim() !== "" && a.weights[pIndex] > 0
      );
      if (hasAssets && Math.abs(total - 100) < 0.01) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Backtest Settings */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Year
            </label>
            <select
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Capital ($)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
            />
          </div>
        </div>
      </div>

      {/* Portfolio Assets Table */}
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <table className="w-full">
            <thead>
              <tr>
                {/* Asset Label Column Header */}
                <th className="text-left pb-3 pr-4">
                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                    Portfolio Assets
                    <button
                      type="button"
                      onClick={clearAllAssets}
                      title="Clear all assets"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </th>

                {/* Ticker Column Header - empty */}
                <th className="pb-3 px-2"></th>

                {/* Portfolio Columns */}
                {Array.from({ length: portfolioCount }).map((_, pIndex) => (
                  <th key={pIndex} className="text-center pb-3 px-2">
                    <div
                      ref={(el) => { dropdownRefs.current[pIndex] = el; }}
                      className="relative inline-flex items-center gap-1 font-semibold text-gray-900"
                    >
                      Portfolio #{pIndex + 1}
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === pIndex ? null : pIndex)}
                        className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded"
                      >
                        <SettingsIcon />
                        <ChevronDownIcon />
                      </button>

                      {/* Dropdown Menu */}
                      {openDropdown === pIndex && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-40">
                          <button
                            type="button"
                            onClick={() => handlePortfolioAction(pIndex, "equal")}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                          >
                            Equal Weight
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePortfolioAction(pIndex, "normalize")}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                          >
                            Normalize to 100%
                          </button>
                          {Array.from({ length: portfolioCount })
                            .map((_, i) => i)
                            .filter((i) => i !== pIndex)
                            .map((sourceIndex) => (
                              <button
                                key={sourceIndex}
                                type="button"
                                onClick={() => handlePortfolioAction(pIndex, `copy-${sourceIndex}`)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                              >
                                Copy from #{sourceIndex + 1}
                              </button>
                            ))}
                          <button
                            type="button"
                            onClick={() => handlePortfolioAction(pIndex, "clear")}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {assets.slice(0, visibleAssets).map((asset, aIndex) => (
                <tr key={aIndex} className="border-t border-gray-100">
                  {/* Asset Label */}
                  <td className="py-2 pr-4 text-gray-700 font-medium whitespace-nowrap">
                    Asset {aIndex + 1}
                    {aIndex === visibleAssets - 1 && visibleAssets < MAX_ASSETS && (
                      <button
                        type="button"
                        onClick={showMoreAssets}
                        className="ml-2 text-blue-600 hover:underline text-sm font-normal"
                      >
                        (More)
                      </button>
                    )}
                  </td>

                  {/* Ticker Input with Autocomplete */}
                  <td className="py-2 px-2">
                    <TickerCombobox
                      value={asset.ticker}
                      onChange={(value) => updateTicker(aIndex, value)}
                      validationStatus={asset.ticker ? getStatus(asset.ticker) : null}
                      placeholder="Ticker symbol"
                    />
                  </td>

                  {/* Weight Inputs for each Portfolio */}
                  {Array.from({ length: portfolioCount }).map((_, pIndex) => (
                    <td key={pIndex} className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={asset.weights[pIndex] || ""}
                          onChange={(e) =>
                            updateWeight(aIndex, pIndex, Number(e.target.value) || 0)
                          }
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}

              {/* Total Row */}
              <tr className="border-t-2 border-gray-300">
                <td className="py-3 pr-4 font-semibold text-gray-900">Total</td>
                <td className="py-3 px-2"></td>
                {Array.from({ length: portfolioCount }).map((_, pIndex) => {
                  const total = getPortfolioTotal(pIndex);
                  const isValid = Math.abs(total - 100) < 0.01;
                  const hasEntries = assets.some((a) => a.weights[pIndex] > 0);

                  return (
                    <td key={pIndex} className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-20 px-3 py-2 rounded-lg text-right font-medium ${
                            hasEntries
                              ? isValid
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {total}
                        </div>
                        <span className="text-gray-500">%</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={!hasValidPortfolio() || loading}
            >
              Analyze Portfolios
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
