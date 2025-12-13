"use client";

import { useState } from "react";
import { BacktestForm, StatsPanel, IndividualStatsTable } from "@/components/backtest";
import { EquityCurveChart, AllocationPieChart } from "@/components/charts";
import { Card } from "@/components/ui";
import { runBacktest } from "@/lib/api";
import type { BacktestResponse } from "@/types";

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

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResponse | null>(null);

  const handleSubmit = async (data: BacktestFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await runBacktest({
        tickers: data.tickers.map((t) => t.ticker),
        weights: data.tickers.map((t) => t.weight),
        start_date: data.startDate,
        end_date: data.endDate,
        initial_capital: data.initialCapital,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const allocationData = result
    ? Object.entries(result.individual_stats).map(([name, stats]) => ({
        name,
        value: stats.weight,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            QuantiPy
          </h1>
          <p className="mt-1 text-gray-500">
            High-Performance US Stock Portfolio Backtest System
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-1">
            <BacktestForm onSubmit={handleSubmit} loading={loading} />

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {result ? (
              <>
                {/* Stats Panel */}
                <StatsPanel stats={result.stats} />

                {/* Equity Curve Chart */}
                <Card title="Portfolio Equity Curve">
                  <EquityCurveChart data={result.equity_curve} />
                </Card>

                {/* Allocation & Individual Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card title="Asset Allocation">
                    <AllocationPieChart data={allocationData} />
                  </Card>
                  <IndividualStatsTable stats={result.individual_stats} />
                </div>
              </>
            ) : (
              <Card>
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Ready to Backtest
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Configure your portfolio on the left and click &quot;Run Backtest&quot;
                    to see the performance analysis.
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
            QuantiPy - Built with Next.js & FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}
