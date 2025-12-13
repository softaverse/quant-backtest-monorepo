"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PortfolioInfo {
  name: string;
  color: string;
}

interface EquityCurveChartProps {
  data: Record<string, string | number>[];
  portfolios?: PortfolioInfo[];
  height?: number;
}

export function EquityCurveChart({
  data,
  portfolios,
  height = 400,
}: EquityCurveChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // 如果沒有傳入 portfolios，使用默認的單一曲線模式
  const lines = portfolios || [{ name: "value", color: "#3b82f6" }];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatCurrency(value), name]}
          labelStyle={{ fontWeight: "bold" }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        <Legend />
        {lines.map((line) => (
          <Line
            key={line.name}
            type="monotone"
            dataKey={line.name}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: line.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
