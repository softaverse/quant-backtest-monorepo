import { Card } from "@/components/ui";

interface PortfolioStats {
  initial_capital: number;
  final_value: number;
  cagr: number;
  max_drawdown: number;
  annualized_volatility: number;
  total_return: number;
}

interface PortfolioData {
  name: string;
  color: string;
  stats: PortfolioStats;
}

interface StatsComparisonTableProps {
  portfolios: PortfolioData[];
  benchmark?: {
    stats: PortfolioStats;
    color: string;
  };
  dateRange?: {
    start_date: string;
    end_date: string;
  };
}

export function StatsComparisonTable({
  portfolios,
  benchmark,
  dateRange,
}: StatsComparisonTableProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number, showSign = true) => {
    const sign = showSign && value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  // All columns: portfolios + benchmark
  const allColumns = [
    ...portfolios,
    ...(benchmark ? [{ name: "S&P 500", color: benchmark.color, stats: benchmark.stats }] : []),
  ];

  const rows = [
    {
      label: "Initial Capital",
      getValue: (stats: PortfolioStats) => formatCurrency(stats.initial_capital),
      getColor: () => "text-gray-900",
    },
    {
      label: "Final Value",
      getValue: (stats: PortfolioStats) => formatCurrency(stats.final_value),
      getColor: (stats: PortfolioStats) =>
        stats.final_value >= stats.initial_capital ? "text-green-600" : "text-red-600",
    },
    {
      label: "Total Return",
      getValue: (stats: PortfolioStats) => formatPercent(stats.total_return),
      getColor: (stats: PortfolioStats) =>
        stats.total_return >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "CAGR",
      getValue: (stats: PortfolioStats) => formatPercent(stats.cagr),
      getColor: (stats: PortfolioStats) =>
        stats.cagr >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Max Drawdown",
      getValue: (stats: PortfolioStats) => `-${stats.max_drawdown.toFixed(2)}%`,
      getColor: () => "text-red-600",
    },
    {
      label: "Annual Volatility",
      getValue: (stats: PortfolioStats) => `${stats.annualized_volatility.toFixed(2)}%`,
      getColor: () => "text-gray-900",
    },
  ];

  return (
    <Card title="Performance Comparison">
      {/* Date Range */}
      {dateRange && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-blue-600">
            <span className="font-medium">Backtest Period:</span>{" "}
            {dateRange.start_date} ~ {dateRange.end_date}
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Metric
              </th>
              {allColumns.map((col, index) => (
                <th key={index} className="text-right py-3 px-4 font-semibold">
                  <div className="flex items-center justify-end gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-gray-900">{col.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.label}
                className={`border-b border-gray-100 ${
                  rowIndex % 2 === 0 ? "bg-gray-50" : "bg-white"
                }`}
              >
                <td className="py-3 px-4 font-medium text-gray-700">
                  {row.label}
                </td>
                {allColumns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`py-3 px-4 text-right font-semibold ${row.getColor(col.stats)}`}
                  >
                    {row.getValue(col.stats)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
