"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu, LoginButton } from "@/components/auth";
import { SavedPortfoliosList, BacktestHistoryList } from "@/components/dashboard";
import { getHistoryEntry } from "@/lib/history-api";
import type { SavedPortfolio, HistorySummary, HistoryEntry } from "@/types";
import { Card } from "@/components/ui";
import { EquityCurveChart } from "@/components/charts";
import { StatsComparisonTable } from "@/components/backtest";

type Tab = "portfolios" | "history";

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("portfolios");
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleLoadPortfolio = (portfolio: SavedPortfolio) => {
    // Store portfolio data in sessionStorage and redirect to home page
    sessionStorage.setItem("loadPortfolio", JSON.stringify(portfolio));
    router.push("/");
  };

  const handleEditPortfolio = (portfolio: SavedPortfolio) => {
    // Store portfolio data in sessionStorage with edit flag
    sessionStorage.setItem("editPortfolio", JSON.stringify(portfolio));
    router.push("/");
  };

  const handleViewHistory = async (summary: HistorySummary) => {
    try {
      setLoadingHistory(true);
      const fullHistory = await getHistoryEntry(summary.id);
      setSelectedHistory(fullHistory);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load history details");
    } finally {
      setLoadingHistory(false);
    }
  };

  const closeHistoryModal = () => {
    setSelectedHistory(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in to access your dashboard
          </h1>
          <LoginButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-gray-500">
                Welcome back, {user?.name || user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                New Backtest
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("portfolios")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "portfolios"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Saved Portfolios
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "history"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Backtest History
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "portfolios" ? (
          <SavedPortfoliosList
            onLoadPortfolio={handleLoadPortfolio}
            onEditPortfolio={handleEditPortfolio}
          />
        ) : (
          <BacktestHistoryList onViewHistory={handleViewHistory} />
        )}
      </main>

      {/* History Detail Modal */}
      {selectedHistory && selectedHistory.full_results && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeHistoryModal}
            ></div>

            <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedHistory.portfolio_name || "Backtest Results"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedHistory.start_date} to {selectedHistory.end_date}
                  </p>
                </div>
                <button
                  onClick={closeHistoryModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Equity Curve */}
                <Card title="Portfolio Performance vs Vanguard 500">
                  <EquityCurveChart
                    data={selectedHistory.full_results.equity_curve.map((point, index) => ({
                      date: point.date,
                      Portfolio: point.value,
                      "Vanguard 500": selectedHistory.full_results?.benchmark_curve[index]?.value ?? 0,
                    }))}
                    portfolios={[
                      { name: "Portfolio", color: "#3b82f6" },
                      { name: "Vanguard 500", color: "#9ca3af" },
                    ]}
                  />
                </Card>

                {/* Stats */}
                <StatsComparisonTable
                  portfolios={[
                    {
                      name: selectedHistory.portfolio_name || "Portfolio",
                      color: "#3b82f6",
                      stats: selectedHistory.full_results.stats,
                    },
                  ]}
                  benchmark={
                    selectedHistory.full_results.benchmark_stats
                      ? { stats: selectedHistory.full_results.benchmark_stats, color: "#9ca3af" }
                      : undefined
                  }
                  dateRange={selectedHistory.full_results.date_range}
                />

                {/* Tickers */}
                <Card title="Portfolio Composition">
                  <div className="flex flex-wrap gap-2">
                    {selectedHistory.tickers.map((ticker, index) => (
                      <span
                        key={ticker}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {ticker}: {(selectedHistory.weights[index] * 100).toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for history */}
      {loadingHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Backtest Portfolio
          </p>
        </div>
      </footer>
    </div>
  );
}
