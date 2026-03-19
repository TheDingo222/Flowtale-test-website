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
    return <div className="h-48 flex items-center justify-center text-[#C6C6C6] text-sm">No data</div>
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#334155' }} />
        <YAxis tick={{ fontSize: 10, fill: '#334155' }} />
        <Tooltip
          formatter={(value) => [(value as number).toFixed(2), 'Total']}
          contentStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="total" fill="#4DD8E0" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
