import { Card } from "@/components/ui";

interface PortfolioStats {
  initial_capital: number;
  final_value: number;
  cagr: number;
  max_drawdown: number;
  annualized_volatility: number;
  total_return: number;
}

interface DateRange {
  start_date: string;
  end_date: string;
}

interface StatsPanelProps {
  stats: PortfolioStats;
  dateRange?: DateRange;
  portfolioName?: string;
  color?: string;
}

export function StatsPanel({ stats, dateRange, portfolioName, color }: StatsPanelProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

  const statItems = [
    {
      label: "Initial Capital",
      value: formatCurrency(stats.initial_capital),
      color: "text-gray-900",
    },
    {
      label: "Final Value",
      value: formatCurrency(stats.final_value),
      color: stats.final_value >= stats.initial_capital ? "text-green-600" : "text-red-600",
    },
    {
      label: "Total Return",
      value: formatPercent(stats.total_return),
      color: stats.total_return >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "CAGR",
      value: formatPercent(stats.cagr),
      color: stats.cagr >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Max Drawdown",
      value: `-${stats.max_drawdown.toFixed(2)}%`,
      color: "text-red-600",
    },
    {
      label: "Annual Volatility",
      value: `${stats.annualized_volatility.toFixed(2)}%`,
      color: "text-gray-900",
    },
  ];

  const title = portfolioName ? `${portfolioName} Statistics` : "Portfolio Statistics";

  return (
    <Card title={title}>
      {/* 日期範圍 */}
      {dateRange && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-blue-600">
            <span className="font-medium">Backtest Period:</span>{" "}
            {dateRange.start_date} ~ {dateRange.end_date}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
