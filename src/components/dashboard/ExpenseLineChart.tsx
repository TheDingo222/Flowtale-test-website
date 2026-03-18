'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  total: number
}

export default function ExpenseLineChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
        <Tooltip
          formatter={(value) => [(value as number).toFixed(2), 'Amount']}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#00a8c8"
          dot={false}
          strokeWidth={2}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
