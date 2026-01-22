"use client";

import type { SavedPortfolio } from "@/types";

interface PortfolioCardProps {
  portfolio: SavedPortfolio;
  onLoad: (portfolio: SavedPortfolio) => void;
  onEdit: (portfolio: SavedPortfolio) => void;
  onDelete: (portfolio: SavedPortfolio) => void;
  onToggleFavorite: (portfolio: SavedPortfolio) => void;
}

export function PortfolioCard({
  portfolio,
  onLoad,
  onEdit,
  onDelete,
  onToggleFavorite,
}: PortfolioCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {portfolio.name}
            </h3>
            <button
              onClick={() => onToggleFavorite(portfolio)}
              className="text-gray-400 hover:text-yellow-500 transition-colors"
              title={portfolio.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              {portfolio.is_favorite ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
            </button>
          </div>
          {portfolio.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {portfolio.description}
            </p>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex flex-wrap gap-1">
          {portfolio.tickers.slice(0, 5).map((ticker, index) => (
            <span
              key={ticker}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
            >
              {ticker} ({(portfolio.weights[index] * 100).toFixed(0)}%)
            </span>
          ))}
          {portfolio.tickers.length > 5 && (
            <span className="text-xs text-gray-500">
              +{portfolio.tickers.length - 5} more
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>Created {formatDate(portfolio.created_at)}</span>
        <span>{portfolio.tickers.length} assets</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onLoad(portfolio)}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          Load
        </button>
        <button
          onClick={() => onEdit(portfolio)}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(portfolio)}
          className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
