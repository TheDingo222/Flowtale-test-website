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
          <h1 className="text-2xl font-semibold text-navy">Archive</h1>
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {/* Search + totals header */}
          <div className="p-3 border-b border-border bg-muted flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-light-grey" />
              <Input
                placeholder="Search receipts..."
                className="pl-8 h-8 text-sm bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground flex gap-4 ml-auto">
              <span>
                Refundable:{' '}
                <strong className="text-dark-slate">
                  {refundable.toFixed(2)} {currency}
                </strong>
              </span>
              <span>
                Total:{' '}
                <strong className="text-dark-slate">
                  {total.toFixed(2)} {currency}
                </strong>
              </span>
            </div>
          </div>

          {fetching ? (
            <div className="p-8 text-center text-light-grey text-sm">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-light-grey text-sm">No archived expenses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">Date</th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">ID</th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">User</th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">Description</th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">Category</th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">Tag</th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">Payment</th>
                    <th className="text-left px-3 py-2.5 text-muted-foreground font-medium text-xs">Status</th>
                    <th className="text-right px-3 py-2.5 text-muted-foreground font-medium text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {expenses.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => setSelected(e)}
                      className={`cursor-pointer transition-colors ${
                        selected?.id === e.id ? 'bg-blue-50' : 'hover:bg-muted'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                        {e.receiptDate
                          ? format(new Date(e.receiptDate), 'dd.MM.yyyy')
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-light-grey text-xs">#{e.sequentialId}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-coral text-white text-xs font-medium">
                          {(e.user.initials || e.user.name.slice(0, 2)).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-navy max-w-[200px] truncate">
                        {e.description ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{e.category?.name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">
                        {e.tag?.name ? (
                          <span className="bg-secondary px-1.5 py-0.5 rounded text-xs">
                            {e.tag.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                        {e.paymentMethod?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <ExpenseStatusBadge status={e.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-navy whitespace-nowrap">
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
        <div className="bg-card rounded-lg border border-border p-4 sticky top-6">
          {selected ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-light-grey uppercase tracking-wide">Expense Details</p>
                <p className="font-semibold text-navy mt-1">
                  {selected.amount.toFixed(2)} {selected.currency}
                </p>
              </div>
              <div className="space-y-1.5 text-sm">
                {selected.description && (
                  <p className="text-dark-slate">{selected.description}</p>
                )}
                <p className="text-muted-foreground">
                  <span className="font-medium">User:</span> {selected.user.name}
                </p>
                {selected.category && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Category:</span> {selected.category.name}
                  </p>
                )}
                {selected.paymentMethod && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Payment:</span> {selected.paymentMethod.name}
                  </p>
                )}
                {selected.tag && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Tag:</span> {selected.tag.name}
                  </p>
                )}
                {selected.receiptDate && (
                  <p className="text-muted-foreground">
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
                  className="flex items-center gap-1.5 text-sm text-cyan hover:underline"
                >
                  <ExternalLink size={13} />
                  View receipt
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-light-grey text-center py-4">
              Click an expense to see details
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
