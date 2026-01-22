"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BacktestForm, StatsComparisonTable, IndividualStatsTable, SavePortfolioModal } from "@/components/backtest";
import { EquityCurveChart } from "@/components/charts";
import { Card, Button } from "@/components/ui";
import { LoginButton, UserMenu } from "@/components/auth";
import { useAuth } from "@/contexts/AuthContext";
import { runBatchBacktest } from "@/lib/api";
import { runAndSaveBacktest } from "@/lib/history-api";
import type { BatchBacktestResponse, SavedPortfolio } from "@/types";

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

const PORTFOLIO_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];
const BENCHMARK_COLOR = "#9ca3af"; // Gray for Vanguard 500

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchBacktestResponse | null>(null);
  const [portfolioColors, setPortfolioColors] = useState<Record<string, string>>({});
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [lastBacktestData, setLastBacktestData] = useState<{ tickers: string[]; weights: number[] } | null>(null);
  const [loadedPortfolio, setLoadedPortfolio] = useState<SavedPortfolio | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (searchParams.get("login_required") === "true") {
      setShowLoginRequired(true);
      // Clean up URL
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  // Load portfolio from sessionStorage (from dashboard)
  useEffect(() => {
    const loadPortfolioData = sessionStorage.getItem("loadPortfolio");
    const editPortfolioData = sessionStorage.getItem("editPortfolio");

    if (loadPortfolioData) {
      try {
        const portfolio = JSON.parse(loadPortfolioData) as SavedPortfolio;
        setLoadedPortfolio(portfolio);
        setFormKey((prev) => prev + 1);
      } catch (e) {
        console.error("Failed to parse portfolio data", e);
      }
      sessionStorage.removeItem("loadPortfolio");
    } else if (editPortfolioData) {
      try {
        const portfolio = JSON.parse(editPortfolioData) as SavedPortfolio;
        setLoadedPortfolio(portfolio);
        setFormKey((prev) => prev + 1);
      } catch (e) {
        console.error("Failed to parse portfolio data", e);
      }
      sessionStorage.removeItem("editPortfolio");
    }
  }, []);

  const handleSubmit = async (data: BacktestFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Store the last backtest data for saving
      if (data.portfolios.length === 1) {
        const portfolio = data.portfolios[0];
        setLastBacktestData({
          tickers: portfolio.tickers.map((t) => t.ticker),
          weights: portfolio.tickers.map((t) => t.weight),
        });
      }

      // If authenticated and saveToHistory is enabled, use run-and-save for single portfolio
      if (isAuthenticated && saveToHistory && data.portfolios.length === 1) {
        const portfolio = data.portfolios[0];
        const response = await runAndSaveBacktest({
          tickers: portfolio.tickers.map((t) => t.ticker),
          weights: portfolio.tickers.map((t) => t.weight),
          start_date: data.startDate,
          end_date: data.endDate,
          initial_capital: data.initialCapital,
          portfolio_name: portfolio.name,
          portfolio_id: loadedPortfolio?.id,
          save_to_history: true,
        });

        // Convert to batch response format
        const batchResponse: BatchBacktestResponse = {
          portfolios: [
            {
              name: portfolio.name,
              stats: response.stats,
              equity_curve: response.equity_curve,
              individual_stats: response.individual_stats,
            },
          ],
          date_range: response.date_range,
          benchmark_curve: response.benchmark_curve,
          benchmark_stats: response.benchmark_stats,
        };

        const colors: Record<string, string> = {};
        colors[portfolio.name] = PORTFOLIO_COLORS[0];
        setPortfolioColors(colors);
        setResult(batchResponse);
      } else {
        // Use batch backtest for multiple portfolios or when not saving
        const response = await runBatchBacktest({
          portfolios: data.portfolios.map((portfolio) => ({
            name: portfolio.name,
            tickers: portfolio.tickers.map((t) => t.ticker),
            weights: portfolio.tickers.map((t) => t.weight),
          })),
          start_date: data.startDate,
          end_date: data.endDate,
          initial_capital: data.initialCapital,
        });

        const colors: Record<string, string> = {};
        data.portfolios.forEach((portfolio, index) => {
          colors[portfolio.name] = PORTFOLIO_COLORS[index];
        });
        setPortfolioColors(colors);
        setResult(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 合併多組淨值曲線數據（包含 Vanguard 500 基準）
  const combinedEquityData = result && result.portfolios.length > 0
    ? (() => {
        // 建立 benchmark 日期對應表
        const benchmarkMap = new Map(
          result.benchmark_curve.map((p) => [p.date, p.value])
        );

        return result.portfolios[0].equity_curve.map((point, index) => {
          const combined: Record<string, string | number> = { date: point.date };
          result.portfolios.forEach((portfolio) => {
            combined[portfolio.name] = portfolio.equity_curve[index]?.value ?? 0;
          });
          // 用日期匹配 Vanguard 500 基準數據
          const benchmarkValue = benchmarkMap.get(point.date);
          if (benchmarkValue !== undefined) {
            combined["Vanguard 500"] = benchmarkValue;
          }
          return combined;
        });
      })()
    : [];

  // 圖表線條配置（組合 + 基準）
  const chartPortfolios = result && result.portfolios.length > 0
    ? [
        ...result.portfolios.map((p) => ({ name: p.name, color: portfolioColors[p.name] || "#3b82f6" })),
        { name: "Vanguard 500", color: BENCHMARK_COLOR },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Backtest Portfolio</h1>
              <p className="mt-1 text-gray-500">
                Backtest U.S. stock portfolios and analyze long-term performance with historical data.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/options"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Options Backtest &rarr;
              </Link>
              {!authLoading && (isAuthenticated ? <UserMenu /> : <LoginButton />)}
            </div>
          </div>
        </div>
      </header>

      {/* Login Required Notification */}
      {showLoginRequired && !isAuthenticated && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-amber-800">Please sign in to access Options Backtest.</p>
            </div>
            <button
              onClick={() => setShowLoginRequired(false)}
              className="text-amber-600 hover:text-amber-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Form Section - Full Width */}
          <div className="w-full">
            {/* Save to History Checkbox */}
            {isAuthenticated && (
              <div className="mb-4 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={saveToHistory}
                    onChange={(e) => setSaveToHistory(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  Save results to history
                </label>
                {loadedPortfolio && (
                  <span className="text-sm text-gray-500">
                    Loaded: <strong>{loadedPortfolio.name}</strong>
                  </span>
                )}
              </div>
            )}

            <BacktestForm key={formKey} onSubmit={handleSubmit} loading={loading} initialPortfolio={loadedPortfolio} />

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Results Section - Full Width */}
          <div className="w-full space-y-6">
            {result && result.portfolios.length > 0 ? (
              <>
                {/* Save Portfolio Button */}
                {isAuthenticated && lastBacktestData && result.portfolios.length === 1 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowSaveModal(true)}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Save Portfolio
                    </Button>
                  </div>
                )}

                {/* Combined Equity Curve Chart */}
                <Card title="Portfolio Comparison vs Vanguard 500">
                  <EquityCurveChart
                    data={combinedEquityData}
                    portfolios={chartPortfolios}
                  />
                </Card>

                {/* Performance Comparison Table */}
                <StatsComparisonTable
                  portfolios={result.portfolios.map((p) => ({
                    name: p.name,
                    color: portfolioColors[p.name] || "#3b82f6",
                    stats: p.stats,
                  }))}
                  benchmark={
                    result.benchmark_stats
                      ? { stats: result.benchmark_stats, color: BENCHMARK_COLOR }
                      : undefined
                  }
                  dateRange={result.date_range}
                />

                {/* Individual Stats for each portfolio */}
                {result.portfolios.map((portfolio, index) => (
                  <IndividualStatsTable
                    key={index}
                    stats={portfolio.individual_stats}
                    portfolioName={portfolio.name}
                    color={portfolioColors[portfolio.name] || "#3b82f6"}
                  />
                ))}
              </>
            ) : (
              <Card>
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Ready to Backtest
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Configure up to 3 portfolios and click &quot;Run Backtest&quot;
                    to compare their performance.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            Backtest Portfolio
          </p>
        </div>
      </footer>

      {/* Save Portfolio Modal */}
      {lastBacktestData && (
        <SavePortfolioModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          tickers={lastBacktestData.tickers}
          weights={lastBacktestData.weights}
          existingPortfolio={loadedPortfolio}
          onSaved={(portfolio) => {
            setLoadedPortfolio(portfolio);
            alert(`Portfolio "${portfolio.name}" saved successfully!`);
          }}
        />
      )}
    </div>
  );
}
