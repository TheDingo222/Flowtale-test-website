import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  PENDING: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  APPROVED: { label: 'Approved', className: 'bg-green-50 text-green-700 border-green-200' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-600 border-red-200' },
}

interface Props {
  status: string
  labelMap?: Record<string, string>
}

export default function ExpenseStatusBadge({ status, labelMap }: Props) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  const label = labelMap?.[status] ?? config.label

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium px-2 py-0.5 ${config.className}`}
    >
      {label}
    </Badge>
  )
}
