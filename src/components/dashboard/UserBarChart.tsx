'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  name: string
  total: number
}

export default function UserBarChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip
          formatter={(value) => [(value as number).toFixed(2), 'Total']}
          contentStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="total" fill="#00a8c8" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
