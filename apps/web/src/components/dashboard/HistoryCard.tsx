"use client";

import type { HistorySummary } from "@/types";

interface HistoryCardProps {
  history: HistorySummary;
  onView: (history: HistorySummary) => void;
  onDelete: (history: HistorySummary) => void;
}

export function HistoryCard({ history, onView, onDelete }: HistoryCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatNumber = (value: number | null, suffix = "") => {
    if (value === null) return "N/A";
    return `${value.toFixed(2)}${suffix}`;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isPositive = (history.total_return ?? 0) >= 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {history.portfolio_name || "Unnamed Portfolio"}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {history.start_date} to {history.end_date}
          </p>
        </div>
        <div className={`text-right ${isPositive ? "text-green-600" : "text-red-600"}`}>
          <div className="font-bold text-lg">
            {formatNumber(history.total_return, "%")}
          </div>
          <div className="text-xs text-gray-500">Total Return</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 text-xs">CAGR</div>
          <div className={`font-medium ${(history.cagr ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatNumber(history.cagr, "%")}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 text-xs">Max DD</div>
          <div className="font-medium text-red-600">
            -{formatNumber(history.max_drawdown, "%")}
          </div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-gray-500 text-xs">Sharpe</div>
          <div className="font-medium text-gray-900">
            {formatNumber(history.sharpe_ratio)}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex flex-wrap gap-1">
          {history.tickers.slice(0, 4).map((ticker, index) => (
            <span
              key={ticker}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              {ticker} ({(history.weights[index] * 100).toFixed(0)}%)
            </span>
          ))}
          {history.tickers.length > 4 && (
            <span className="text-xs text-gray-500">
              +{history.tickers.length - 4} more
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{formatDate(history.created_at)}</span>
        <span>
          {formatCurrency(history.initial_capital)} → {formatCurrency(history.final_value)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onView(history)}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={() => onDelete(history)}
          className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
