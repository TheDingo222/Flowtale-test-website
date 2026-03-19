'use client'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  name: string
  value: number
}

const COLORS = [
  '#4DD8E0', '#0E122C', '#EA6468', '#1E293B',
  '#334155', '#FF6267', '#C6C6C6', '#4DD8E0',
]

export default function CategoryPieChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-[#C6C6C6] text-sm">No data</div>
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="40%"
          outerRadius={85}
          label={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [(value as number).toFixed(2)]} contentStyle={{ fontSize: 11 }} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string) =>
            value.length > 20 ? value.slice(0, 18) + '…' : value
          }
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
