import { Card } from "@/components/ui";

interface StockStats {
  weight: number;
  total_return: number;
  cagr: number;
}

interface IndividualStatsTableProps {
  stats: Record<string, StockStats>;
  portfolioName?: string;
  color?: string;
}

export function IndividualStatsTable({ stats, portfolioName, color }: IndividualStatsTableProps) {
  const formatPercent = (value: number) =>
    `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

  const title = portfolioName
    ? `${portfolioName} - Individual Stock Performance`
    : "Individual Stock Performance";

  return (
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">
                Ticker
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">
                Weight
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">
                Total Return
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">
                CAGR
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats).map(([ticker, data]) => (
              <tr
                key={ticker}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-3 px-4 font-medium text-gray-900">
                  {ticker}
                </td>
                <td className="py-3 px-4 text-right text-gray-600">
                  {(data.weight * 100).toFixed(1)}%
                </td>
                <td
                  className={`py-3 px-4 text-right font-medium ${
                    data.total_return >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPercent(data.total_return)}
                </td>
                <td
                  className={`py-3 px-4 text-right font-medium ${
                    data.cagr >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPercent(data.cagr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
