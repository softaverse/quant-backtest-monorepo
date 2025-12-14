"use client";

import { Card } from "@/components/ui";
import type { OptionsStats } from "@/types/options";

interface OptionsStatsPanelProps {
  stats: OptionsStats;
}

export function OptionsStatsPanel({ stats }: OptionsStatsPanelProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

  const statItems = [
    {
      label: "Strategy",
      value: stats.strategy,
      color: "text-gray-900",
    },
    {
      label: "Initial Capital",
      value: formatCurrency(stats.initial_capital),
      color: "text-gray-900",
    },
    {
      label: "Final Value",
      value: formatCurrency(stats.final_value),
      color:
        stats.final_value >= stats.initial_capital
          ? "text-green-600"
          : "text-red-600",
    },
    {
      label: "Total P&L",
      value: formatCurrency(stats.total_pnl),
      color: stats.total_pnl >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Return",
      value: formatPercent(stats.total_return),
      color: stats.total_return >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Max Profit",
      value: formatCurrency(stats.max_profit),
      color: "text-green-600",
    },
    {
      label: "Max Loss",
      value: formatCurrency(stats.max_loss),
      color: "text-red-600",
    },
    {
      label: "Max Drawdown",
      value: formatCurrency(stats.max_drawdown),
      color: "text-red-600",
    },
    {
      label: "Days Held",
      value: stats.days_held.toString(),
      color: "text-gray-900",
    },
    {
      label: "Entry Date",
      value: stats.entry_date,
      color: "text-gray-900",
    },
    {
      label: "Exit Date",
      value: stats.exit_date,
      color: "text-gray-900",
    },
    {
      label: "Breakeven",
      value:
        stats.breakeven_points && stats.breakeven_points.length > 0
          ? stats.breakeven_points
              .filter((b) => b != null)
              .map((b) => `$${b.toFixed(2)}`)
              .join(", ") || "N/A"
          : "N/A",
      color: "text-gray-900",
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Options Backtest Statistics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="text-center p-3 bg-gray-50 rounded-lg"
          >
            <p className="text-sm text-gray-500 mb-1">{item.label}</p>
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
