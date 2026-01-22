"use client";

import { useState, useEffect, useCallback } from "react";
import type { HistorySummary } from "@/types";
import { getBacktestHistory, deleteHistoryEntry } from "@/lib/history-api";
import { HistoryCard } from "./HistoryCard";

interface BacktestHistoryListProps {
  onViewHistory: (history: HistorySummary) => void;
  refreshTrigger?: number;
}

export function BacktestHistoryList({
  onViewHistory,
  refreshTrigger,
}: BacktestHistoryListProps) {
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBacktestHistory({ limit: 20 });
      setHistory(response.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshTrigger]);

  const handleDelete = async (entry: HistorySummary) => {
    if (!confirm("Are you sure you want to delete this backtest result?")) {
      return;
    }

    try {
      await deleteHistoryEntry(entry.id);
      setHistory((prev) => prev.filter((h) => h.id !== entry.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete history entry");
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
          onClick={fetchHistory}
          className="text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No backtest history
        </h3>
        <p className="text-gray-500">
          Run a backtest with &quot;Save to History&quot; enabled to see results here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {history.map((entry) => (
        <HistoryCard
          key={entry.id}
          history={entry}
          onView={onViewHistory}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
