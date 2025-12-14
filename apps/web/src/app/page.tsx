"use client";

import { useState } from "react";
import Link from "next/link";
import { BacktestForm, StatsComparisonTable, IndividualStatsTable } from "@/components/backtest";
import { EquityCurveChart } from "@/components/charts";
import { Card } from "@/components/ui";
import { runBatchBacktest } from "@/lib/api";
import type { BatchBacktestResponse } from "@/types";

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
const BENCHMARK_COLOR = "#9ca3af"; // Gray for S&P 500

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchBacktestResponse | null>(null);
  const [portfolioColors, setPortfolioColors] = useState<Record<string, string>>({});

  const handleSubmit = async (data: BacktestFormData) => {
    setLoading(true);
    setError(null);

    try {
      // 單次 API 呼叫處理所有組合
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

      // 設定每個組合的顏色
      const colors: Record<string, string> = {};
      data.portfolios.forEach((portfolio, index) => {
        colors[portfolio.name] = PORTFOLIO_COLORS[index];
      });
      setPortfolioColors(colors);

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 合併多組淨值曲線數據（包含 S&P 500 基準）
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
          // 用日期匹配 S&P 500 基準數據
          const benchmarkValue = benchmarkMap.get(point.date);
          if (benchmarkValue !== undefined) {
            combined["S&P 500"] = benchmarkValue;
          }
          return combined;
        });
      })()
    : [];

  // 圖表線條配置（組合 + 基準）
  const chartPortfolios = result && result.portfolios.length > 0
    ? [
        ...result.portfolios.map((p) => ({ name: p.name, color: portfolioColors[p.name] || "#3b82f6" })),
        { name: "S&P 500", color: BENCHMARK_COLOR },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">QuantiPy</h1>
              <p className="mt-1 text-gray-500">
                High-Performance US Stock Portfolio Backtest System
              </p>
            </div>
            <Link
              href="/options"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Options Backtest &rarr;
            </Link>
          </div>
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
            {result && result.portfolios.length > 0 ? (
              <>
                {/* Combined Equity Curve Chart */}
                <Card title="Portfolio Comparison vs S&P 500">
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
            QuantiPy - Built with Next.js & FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}
