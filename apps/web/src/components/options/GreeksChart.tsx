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
import { Card } from "@/components/ui";
import type { GreeksPoint } from "@/types/options";

interface GreeksChartProps {
  data: GreeksPoint[];
  height?: number;
}

const GREEK_COLORS = {
  delta: "#3b82f6",
  gamma: "#10b981",
  theta: "#ef4444",
  vega: "#f59e0b",
  rho: "#8b5cf6",
};

export function GreeksChart({ data, height = 300 }: GreeksChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Greeks Over Time</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No Greeks data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Greeks Over Time</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="delta"
            name="Delta"
            stroke={GREEK_COLORS.delta}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="gamma"
            name="Gamma"
            stroke={GREEK_COLORS.gamma}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="theta"
            name="Theta"
            stroke={GREEK_COLORS.theta}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="vega"
            name="Vega"
            stroke={GREEK_COLORS.vega}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
