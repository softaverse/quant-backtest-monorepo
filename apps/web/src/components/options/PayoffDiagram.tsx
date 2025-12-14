"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui";
import type { PayoffPoint } from "@/types/options";

interface PayoffDiagramProps {
  data: PayoffPoint[];
  currentPrice?: number;
  breakevens?: number[];
  height?: number;
}

export function PayoffDiagram({
  data,
  currentPrice,
  breakevens = [],
  height = 300,
}: PayoffDiagramProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Payoff at Expiration</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No payoff data available
        </div>
      </Card>
    );
  }

  // Split data into profit and loss for different colors
  const profitData = data.map((point) => ({
    ...point,
    profit: point.payoff > 0 ? point.payoff : 0,
    loss: point.payoff < 0 ? point.payoff : 0,
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Payoff at Expiration</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={profitData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="price"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `$${v}`}
          />
          <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), "P&L"]}
            labelFormatter={(label) => `Stock Price: $${label}`}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />

          {/* Current price */}
          {currentPrice && (
            <ReferenceLine
              x={currentPrice}
              stroke="#3b82f6"
              strokeDasharray="5 5"
              label={{
                value: "Current",
                position: "top",
                fill: "#3b82f6",
                fontSize: 12,
              }}
            />
          )}

          {/* Breakeven points */}
          {breakevens.map((be, i) => (
            <ReferenceLine
              key={i}
              x={be}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{
                value: "BE",
                position: "bottom",
                fill: "#f59e0b",
                fontSize: 10,
              }}
            />
          ))}

          <Area
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="loss"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
