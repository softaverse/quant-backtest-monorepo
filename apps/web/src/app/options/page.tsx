"use client";

import { useState } from "react";
import Link from "next/link";
import {
  OptionsBacktestForm,
  GreeksChart,
  PayoffDiagram,
  OptionsStatsPanel,
} from "@/components/options";
import { EquityCurveChart } from "@/components/charts";
import { Card } from "@/components/ui";
import { runOptionsBacktest } from "@/lib/options-api";
import type {
  OptionsBacktestResponse,
  OptionsBacktestFormData,
} from "@/types/options";

export default function OptionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptionsBacktestResponse | null>(null);

  const handleSubmit = async (data: OptionsBacktestFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await runOptionsBacktest({
        ticker: data.ticker,
        strategy_type: data.strategyType,
        start_date: data.startDate,
        end_date: data.endDate,
        initial_capital: data.initialCapital,
        days_to_expiration: data.daysToExpiration,
        position_size: data.positionSize,
        volatility_model: data.volatilityModel,
        fixed_volatility: data.fixedVolatility,
        leg_configs:
          Object.keys(data.legConfigs).length > 0 ? data.legConfigs : undefined,
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Transform daily P&L to equity curve format for chart
  const equityCurveData = result?.daily_pnl.map((point) => ({
    date: point.date,
    value: point.position_value,
  }));

  // Get current price from first data point
  const currentPrice = result?.daily_pnl[0]?.spot_price;

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Options Backtest
            </h1>
            <p className="text-gray-600 mt-1">
              Simulate options strategies using Black-Scholes pricing
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            &larr; Portfolio Backtest
          </Link>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-1">
            <OptionsBacktestForm onSubmit={handleSubmit} loading={loading} />
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2 space-y-6">
            {result ? (
              <>
                {/* Statistics Panel */}
                <OptionsStatsPanel stats={result.stats} />

                {/* Position Value Chart */}
                {equityCurveData && equityCurveData.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Position Value Over Time
                    </h3>
                    <EquityCurveChart
                      data={equityCurveData.map((d) => ({
                        date: d.date,
                        [result.stats.strategy]: d.value,
                      }))}
                      portfolios={[
                        { name: result.stats.strategy, color: "#3b82f6" },
                      ]}
                    />
                  </Card>
                )}

                {/* Greeks Chart */}
                <GreeksChart data={result.greeks_series} />

                {/* Payoff Diagram */}
                <PayoffDiagram
                  data={result.payoff_diagram}
                  currentPrice={currentPrice}
                  breakevens={result.stats.breakeven_points?.filter((b) => b != null) ?? []}
                />

                {/* Trades Table */}
                {result.trades.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Trade History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3">Date</th>
                            <th className="text-left py-2 px-3">Action</th>
                            <th className="text-left py-2 px-3">Strategy</th>
                            <th className="text-right py-2 px-3">Spot Price</th>
                            <th className="text-right py-2 px-3">Strikes</th>
                            <th className="text-right py-2 px-3">Net Premium</th>
                            <th className="text-right py-2 px-3">Final P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.trades.map((trade, index) => (
                            <tr
                              key={index}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-2 px-3">{trade.date}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    trade.action === "OPEN"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {trade.action}
                                </span>
                              </td>
                              <td className="py-2 px-3">{trade.strategy}</td>
                              <td className="py-2 px-3 text-right">
                                ${trade.spot_price?.toFixed(2) ?? "-"}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {trade.strikes?.map((s) => `$${s}`).join(", ") ?? "-"}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {trade.net_premium !== undefined
                                  ? `$${trade.net_premium.toFixed(2)}`
                                  : "-"}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-medium ${
                                  trade.final_pnl !== undefined
                                    ? trade.final_pnl >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                    : ""
                                }`}
                              >
                                {trade.final_pnl !== undefined
                                  ? `$${trade.final_pnl.toFixed(2)}`
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-6">
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📈</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Ready to Backtest Options
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Configure your options strategy on the left and click
                    &quot;Run Options Backtest&quot; to see simulated results
                    based on Black-Scholes pricing.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
