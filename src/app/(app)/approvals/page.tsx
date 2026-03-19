'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import ExpenseStatusBadge from '@/components/expenses/ExpenseStatusBadge'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'

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
  paymentMethod: { name: string } | null
  tag: { name: string } | null
}

export default function ApprovalsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [fetching, setFetching] = useState(true)

  const loadExpenses = useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch('/api/approvals')
      const data = await res.json()
      setExpenses(Array.isArray(data) ? data : [])
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  async function handleAction(expenseId: string, action: 'APPROVED' | 'REJECTED') {
    setLoading((prev) => ({ ...prev, [expenseId]: true }))
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId,
          action,
          comment: comments[expenseId] ?? undefined,
        }),
      })
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
        setComments((prev) => { const c = { ...prev }; delete c[expenseId]; return c })
      }
    } finally {
      setLoading((prev) => ({ ...prev, [expenseId]: false }))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Approvals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review each expense and approve or reject it.
          </p>
        </div>
      </div>

      {fetching ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center text-light-grey">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-muted-foreground">No expenses require approval at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="bg-card rounded-lg border border-border shadow-sm">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* User avatar */}
                    <div className="w-9 h-9 rounded-full bg-coral flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {expense.user.initials || expense.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-navy">{expense.user.name}</span>
                        <span className="text-xs text-light-grey">#{expense.sequentialId}</span>
                        <ExpenseStatusBadge status={expense.status} />
                      </div>
                      <p className="text-dark-slate text-sm">{expense.description ?? '—'}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {expense.category && <span>{expense.category.name}</span>}
                        {expense.tag && <span className="bg-secondary px-1.5 py-0.5 rounded">{expense.tag.name}</span>}
                        {expense.receiptDate && (
                          <span>{format(new Date(expense.receiptDate), 'dd.MM.yyyy')}</span>
                        )}
                        {expense.receiptUrl && (
                          <a
                            href={expense.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan hover:underline"
                          >
                            View receipt
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4">
                    <p className="text-lg font-bold text-navy">
                      {expense.amount.toFixed(2)} {expense.currency}
                    </p>
                    {expense.paymentMethod && (
                      <p className="text-xs text-muted-foreground">{expense.paymentMethod.name}</p>
                    )}
                  </div>
                </div>

                {/* Comment + actions */}
                <div className="mt-3 flex items-end gap-3 pl-12">
                  <Textarea
                    placeholder="Add a comment (optional)..."
                    className="text-sm h-14 resize-none flex-1"
                    value={comments[expense.id] ?? ''}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [expense.id]: e.target.value }))
                    }
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      disabled={loading[expense.id]}
                      onClick={() => handleAction(expense.id, 'APPROVED')}
                    >
                      <Check size={14} />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                      disabled={loading[expense.id]}
                      onClick={() => handleAction(expense.id, 'REJECTED')}
                    >
                      <X size={14} />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
