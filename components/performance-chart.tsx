"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { PracticeSessionWithDetails } from "@/services/practice-service"

interface PerformanceChartProps {
  sessions?: PracticeSessionWithDetails[]
}

export function PerformanceChart({ sessions = [] }: PerformanceChartProps) {
  // Process the sessions data for the chart
  const chartData = sessions
    .filter((session) => session.analysis) // Only include sessions with analysis
    .slice(0, 6) // Take the last 6 sessions
    .map((session) => {
      const date = new Date(session.created_at)
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pace: session.analysis?.pace.score || 0,
        clarity: session.analysis?.clarity.score || 0,
        fillerWords: session.analysis?.fillerWords.score || 0,
      }
    })
    .reverse() // Show oldest to newest

  // If no real data, use sample data
  const data =
    chartData.length > 0
      ? chartData
      : [
          {
            date: "May 1",
            pace: 65,
            clarity: 60,
            fillerWords: 50,
          },
          {
            date: "May 3",
            pace: 68,
            clarity: 65,
            fillerWords: 55,
          },
          {
            date: "May 5",
            pace: 70,
            clarity: 70,
            fillerWords: 60,
          },
          {
            date: "May 7",
            pace: 75,
            clarity: 68,
            fillerWords: 65,
          },
          {
            date: "May 9",
            pace: 80,
            clarity: 72,
            fillerWords: 68,
          },
          {
            date: "May 10",
            pace: 85,
            clarity: 75,
            fillerWords: 72,
          },
        ]

  return (
    <ChartContainer
      config={{
        pace: {
          label: "Pace",
          color: "hsl(var(--chart-1))",
        },
        clarity: {
          label: "Clarity",
          color: "hsl(var(--chart-2))",
        },
        fillerWords: {
          label: "Filler Words",
          color: "hsl(var(--chart-3))",
        },
      }}
      className="h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} stroke="#888888" fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            stroke="#888888"
            fontSize={12}
            domain={[40, 100]}
            ticks={[40, 50, 60, 70, 80, 90, 100]}
          />
          <Line
            type="monotone"
            dataKey="pace"
            strokeWidth={2}
            activeDot={{ r: 6, strokeWidth: 2 }}
            dot={{ r: 4, strokeWidth: 2 }}
            stroke="var(--color-pace)"
          />
          <Line
            type="monotone"
            dataKey="clarity"
            strokeWidth={2}
            activeDot={{ r: 6, strokeWidth: 2 }}
            dot={{ r: 4, strokeWidth: 2 }}
            stroke="var(--color-clarity)"
          />
          <Line
            type="monotone"
            dataKey="fillerWords"
            strokeWidth={2}
            activeDot={{ r: 6, strokeWidth: 2 }}
            dot={{ r: 4, strokeWidth: 2 }}
            stroke="var(--color-fillerWords)"
          />
          <ChartTooltip content={<ChartTooltipContent />} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
