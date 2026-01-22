"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { createPortfolio, updatePortfolio } from "@/lib/portfolio-api";
import type { SavedPortfolio, PortfolioCreate } from "@/types";

interface SavePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickers: string[];
  weights: number[];
  existingPortfolio?: SavedPortfolio | null;
  onSaved?: (portfolio: SavedPortfolio) => void;
}

export function SavePortfolioModal({
  isOpen,
  onClose,
  tickers,
  weights,
  existingPortfolio,
  onSaved,
}: SavePortfolioModalProps) {
  const [name, setName] = useState(existingPortfolio?.name || "");
  const [description, setDescription] = useState(existingPortfolio?.description || "");
  const [isFavorite, setIsFavorite] = useState(existingPortfolio?.is_favorite || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a portfolio name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: PortfolioCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
        tickers,
        weights,
        is_favorite: isFavorite,
      };

      let saved: SavedPortfolio;
      if (existingPortfolio) {
        saved = await updatePortfolio(existingPortfolio.id, data);
      } else {
        saved = await createPortfolio(data);
      }

      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save portfolio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {existingPortfolio ? "Update Portfolio" : "Save Portfolio"}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Portfolio Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Portfolio"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="favorite"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="favorite" className="text-sm text-gray-700">
                Add to favorites
              </label>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Portfolio Composition ({tickers.length} assets)
              </p>
              <div className="flex flex-wrap gap-1">
                {tickers.map((ticker, index) => (
                  <span
                    key={ticker}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {ticker} ({(weights[index] * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={loading}>
              {existingPortfolio ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
