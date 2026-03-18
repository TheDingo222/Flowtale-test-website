'use client'
import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Search, ExternalLink } from 'lucide-react'
import ExpenseStatusBadge from '@/components/expenses/ExpenseStatusBadge'
import { format } from 'date-fns'

interface Expense {
  id: string
  sequentialId: number
  amount: number
  currency: string
  description: string | null
  receiptDate: string | null
  receiptUrl: string | null
  status: string
  user: { id: string; name: string; initials: string }
  category: { name: string } | null
  paymentMethod: { name: string; type: string } | null
  tag: { name: string } | null
}

export default function ArchivePage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Expense | null>(null)
  const [fetching, setFetching] = useState(true)

  const loadExpenses = useCallback(async () => {
    setFetching(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/archive${params}`)
      const data = await res.json()
      setExpenses(Array.isArray(data) ? data : [])
    } finally {
      setFetching(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(loadExpenses, 300) // debounce
    return () => clearTimeout(timer)
  }, [loadExpenses])

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const refundable = expenses
    .filter((e) => e.paymentMethod?.type === 'REIMBURSABLE')
    .reduce((s, e) => s + e.amount, 0)

  const currency = expenses[0]?.currency ?? 'DKK'

  return (
    <div className="flex gap-4">
      {/* Main table */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Archive</h1>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Search + totals header */}
          <div className="p-3 border-b bg-gray-50 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search receipts..."
                className="pl-8 h-8 text-sm bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-gray-500 flex gap-4 ml-auto">
              <span>
                Refundable:{' '}
                <strong className="text-gray-700">
                  {refundable.toFixed(2)} {currency}
                </strong>
              </span>
              <span>
                Total:{' '}
                <strong className="text-gray-700">
                  {total.toFixed(2)} {currency}
                </strong>
              </span>
            </div>
          </div>

          {fetching ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No archived expenses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs">Date</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs">ID</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs">User</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs">Description</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs">Category</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs">Tag</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs">Payment</th>
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs">Status</th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelected(e)}
                      className={`cursor-pointer transition-colors ${
                        selected?.id === e.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {e.receiptDate
                          ? format(new Date(e.receiptDate), 'dd.MM.yyyy')
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs">#{e.sequentialId}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00a8c8] text-white text-xs font-medium">
                          {(e.user.initials || e.user.name.slice(0, 2)).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-800 max-w-[200px] truncate">
                        {e.description ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{e.category?.name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">
                        {e.tag?.name ? (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                            {e.tag.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {e.paymentMethod?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <ExpenseStatusBadge status={e.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {e.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-64 shrink-0">
        <div className="bg-white rounded-lg border p-4 sticky top-6">
          {selected ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Expense Details</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {selected.amount.toFixed(2)} {selected.currency}
                </p>
              </div>
              <div className="space-y-1.5 text-sm">
                {selected.description && (
                  <p className="text-gray-700">{selected.description}</p>
                )}
                <p className="text-gray-500">
                  <span className="font-medium">User:</span> {selected.user.name}
                </p>
                {selected.category && (
                  <p className="text-gray-500">
                    <span className="font-medium">Category:</span> {selected.category.name}
                  </p>
                )}
                {selected.paymentMethod && (
                  <p className="text-gray-500">
                    <span className="font-medium">Payment:</span> {selected.paymentMethod.name}
                  </p>
                )}
                {selected.tag && (
                  <p className="text-gray-500">
                    <span className="font-medium">Tag:</span> {selected.tag.name}
                  </p>
                )}
                {selected.receiptDate && (
                  <p className="text-gray-500">
                    <span className="font-medium">Date:</span>{' '}
                    {format(new Date(selected.receiptDate), 'dd. MMMM yyyy')}
                  </p>
                )}
                <div className="pt-1">
                  <ExpenseStatusBadge status={selected.status} />
                </div>
              </div>
              {selected.receiptUrl && (
                <a
                  href={selected.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-[#00a8c8] hover:underline"
                >
                  <ExternalLink size={13} />
                  View receipt
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              Click an expense to see details
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
