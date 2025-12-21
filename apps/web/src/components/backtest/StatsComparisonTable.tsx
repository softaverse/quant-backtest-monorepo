import { Card } from "@/components/ui";

interface PortfolioStats {
  initial_capital: number;
  final_value: number;
  cagr: number;
  max_drawdown: number;
  annualized_volatility: number;
  total_return: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  best_year: number;
  worst_year: number;
  benchmark_correlation: number;
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

function InfoIcon({ tooltip }: { tooltip: string }) {
  return (
    <span className="inline-flex items-center ml-1 group relative cursor-help">
      <svg
        className="w-4 h-4 text-gray-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {tooltip}
      </span>
    </span>
  );
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
    ...(benchmark ? [{ name: "Vanguard 500 Index Investor", color: benchmark.color, stats: benchmark.stats }] : []),
  ];

  const rows: {
    label: string;
    getValue: (stats: PortfolioStats) => string;
    getColor: (stats: PortfolioStats) => string;
    showInfoIcon?: boolean;
    tooltip?: string;
  }[] = [
    {
      label: "Start Balance",
      getValue: (stats: PortfolioStats) => formatCurrency(stats.initial_capital),
      getColor: () => "text-gray-900",
    },
    {
      label: "End Balance",
      getValue: (stats: PortfolioStats) => formatCurrency(stats.final_value),
      getColor: (stats: PortfolioStats) =>
        stats.final_value >= stats.initial_capital ? "text-green-600" : "text-red-600",
      showInfoIcon: true,
      tooltip: "Final portfolio value",
    },
    {
      label: "Annualized Return (CAGR)",
      getValue: (stats: PortfolioStats) => formatPercent(stats.cagr),
      getColor: (stats: PortfolioStats) =>
        stats.cagr >= 0 ? "text-green-600" : "text-red-600",
      showInfoIcon: true,
      tooltip: "Compound Annual Growth Rate",
    },
    {
      label: "Standard Deviation",
      getValue: (stats: PortfolioStats) => `${stats.annualized_volatility.toFixed(2)}%`,
      getColor: () => "text-gray-900",
    },
    {
      label: "Best Year",
      getValue: (stats: PortfolioStats) => formatPercent(stats.best_year),
      getColor: (stats: PortfolioStats) =>
        stats.best_year >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Worst Year",
      getValue: (stats: PortfolioStats) => formatPercent(stats.worst_year),
      getColor: (stats: PortfolioStats) =>
        stats.worst_year >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Maximum Drawdown",
      getValue: (stats: PortfolioStats) => `-${stats.max_drawdown.toFixed(2)}%`,
      getColor: () => "text-red-600",
      showInfoIcon: true,
      tooltip: "Largest peak-to-trough decline",
    },
    {
      label: "Sharpe Ratio",
      getValue: (stats: PortfolioStats) => stats.sharpe_ratio.toFixed(2),
      getColor: () => "text-gray-900",
    },
    {
      label: "Sortino Ratio",
      getValue: (stats: PortfolioStats) => stats.sortino_ratio.toFixed(2),
      getColor: () => "text-gray-900",
    },
    {
      label: "Benchmark Correlation",
      getValue: (stats: PortfolioStats) => stats.benchmark_correlation.toFixed(2),
      getColor: () => "text-gray-900",
    },
  ];

  return (
    <Card title="Performance Summary">
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
                    {row.showInfoIcon && <InfoIcon tooltip={row.tooltip || ""} />}
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
