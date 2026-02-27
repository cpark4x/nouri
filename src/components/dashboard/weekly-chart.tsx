"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  NUTRIENT_GOOD_THRESHOLD,
  NUTRIENT_WARN_THRESHOLD,
} from "./nutrient-thresholds";

export interface DayData {
  date: string;
  dayLabel: string;
  intake: Record<string, number>;
  percentOfTarget: Record<string, number>;
}

interface WeeklyChartProps {
  days: DayData[];
  nutrient: string;
  target: number;
  unit: string;
}

type ChartEntry = {
  dayLabel: string;
  intake: number;
  percent: number;
};

function getBarColor(percent: number): string {
  if (percent >= NUTRIENT_GOOD_THRESHOLD) return "#22c55e";
  if (percent >= NUTRIENT_WARN_THRESHOLD) return "#eab308";
  return "#ef4444";
}

export function WeeklyChart({ days, nutrient, target, unit }: WeeklyChartProps) {
  const chartData: ChartEntry[] = days.map((day) => ({
    dayLabel: day.dayLabel,
    intake: day.intake[nutrient] ?? 0,
    percent: day.percentOfTarget[nutrient] ?? 0,
  }));

  return (
    <div role="img" aria-label={`${nutrient} intake over the past 7 days`}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
        >
          <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{
              value: unit,
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 11 },
            }}
          />
          <Tooltip
            content={({
              active,
              payload,
            }: {
              active?: boolean;
              payload?: ReadonlyArray<{ payload: ChartEntry }>;
            }) => {
              if (!active || !payload?.length) return null;
              const entry = payload[0]?.payload;
              if (!entry) return null;
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow">
                  <span className="font-medium">{entry.dayLabel}</span>:{" "}
                  {Math.round(entry.intake)}
                  {unit} ({Math.round(entry.percent)}% of target)
                </div>
              );
            }}
          />
          <ReferenceLine
            y={target}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{
              value: "Target",
              position: "right",
              style: { fontSize: 11, fill: "#94a3b8" },
            }}
          />
          <Bar dataKey="intake">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.percent)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
