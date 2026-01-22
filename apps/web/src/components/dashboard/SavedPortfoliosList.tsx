"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedPortfolio } from "@/types";
import { getPortfolios, deletePortfolio, togglePortfolioFavorite } from "@/lib/portfolio-api";
import { PortfolioCard } from "./PortfolioCard";

interface SavedPortfoliosListProps {
  onLoadPortfolio: (portfolio: SavedPortfolio) => void;
  onEditPortfolio: (portfolio: SavedPortfolio) => void;
  refreshTrigger?: number;
}

export function SavedPortfoliosList({
  onLoadPortfolio,
  onEditPortfolio,
  refreshTrigger,
}: SavedPortfoliosListProps) {
  const [portfolios, setPortfolios] = useState<SavedPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPortfolios();
      setPortfolios(response.portfolios);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios, refreshTrigger]);

  const handleDelete = async (portfolio: SavedPortfolio) => {
    if (!confirm(`Are you sure you want to delete "${portfolio.name}"?`)) {
      return;
    }

    try {
      await deletePortfolio(portfolio.id);
      setPortfolios((prev) => prev.filter((p) => p.id !== portfolio.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete portfolio");
    }
  };

  const handleToggleFavorite = async (portfolio: SavedPortfolio) => {
    try {
      const updated = await togglePortfolioFavorite(portfolio.id);
      setPortfolios((prev) =>
        prev.map((p) => (p.id === portfolio.id ? updated : p))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update favorite");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchPortfolios}
          className="text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📁</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No saved portfolios
        </h3>
        <p className="text-gray-500">
          Save a portfolio from the backtest page to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {portfolios.map((portfolio) => (
        <PortfolioCard
          key={portfolio.id}
          portfolio={portfolio}
          onLoad={onLoadPortfolio}
          onEdit={onEditPortfolio}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
        />
      ))}
    </div>
  );
}
