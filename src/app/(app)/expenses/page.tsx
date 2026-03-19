import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { format } from 'date-fns'
import ExpenseStatusBadge from '@/components/expenses/ExpenseStatusBadge'
import CreateExpenseModal from '@/components/expenses/CreateExpenseModal'
import { Receipt } from 'lucide-react'

export default async function ExpensesPage() {
  const session = await auth()
  if (!session) return null

  const t = await getTranslations('expenses')

  const [expenses, categories, paymentMethods, tags] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: session.user.id },
      include: { category: true, paymentMethod: true, tag: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
  ])

  const pending = expenses.filter((e) => ['DRAFT', 'PENDING'].includes(e.status))
  const archived = expenses.filter((e) => ['APPROVED', 'REJECTED'].includes(e.status))

  const totalPending = pending.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and submit your expenses for approval.</p>
        </div>
        <CreateExpenseModal categories={categories} paymentMethods={paymentMethods} tags={tags} />
      </div>

      {/* Stats bar */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border px-4 py-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total expenses</p>
            <p className="text-2xl font-bold text-navy mt-0.5">{expenses.length}</p>
          </div>
          <div className="bg-card rounded-xl border px-4 py-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Awaiting approval</p>
            <p className="text-2xl font-bold text-coral mt-0.5">{pending.length}</p>
          </div>
          <div className="bg-card rounded-xl border px-4 py-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pending total</p>
            <p className="text-2xl font-bold text-cyan mt-0.5">
              {totalPending.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DKK
            </p>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="bg-card rounded-xl border p-16 text-center">
          <Receipt size={40} className="mx-auto text-light-grey mb-3" />
          <p className="text-muted-foreground font-medium">No expenses yet</p>
          <p className="text-sm text-light-grey mt-1">Click &quot;Create Expense&quot; to add your first receipt</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending / Draft */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-dark-slate">Active</h2>
                <span className="bg-coral/10 text-coral text-xs px-2 py-0.5 rounded-full font-semibold">
                  {pending.length}
                </span>
              </div>
              <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">ID</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Category</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Payment</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((e, i) => (
                      <tr key={e.id} className={`hover:bg-muted transition-colors ${i < pending.length - 1 ? 'border-b border-border' : ''}`}>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">
                          {e.receiptDate ? format(new Date(e.receiptDate), 'dd.MM.yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-light-grey text-xs font-mono">#{e.sequentialId}</td>
                        <td className="px-4 py-3.5 text-navy font-medium">{e.description ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          {e.category?.name ? (
                            <span className="bg-secondary text-slate-brand text-xs px-2 py-0.5 rounded-full">{e.category.name}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">{e.paymentMethod?.name ?? '—'}</td>
                        <td className="px-4 py-3.5"><ExpenseStatusBadge status={e.status} /></td>
                        <td className="px-4 py-3.5 text-right font-bold text-navy">
                          {Number(e.amount).toLocaleString('da-DK', { minimumFractionDigits: 2 })} <span className="font-normal text-light-grey text-xs">{e.currency}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Archived */}
          {archived.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-dark-slate">Processed</h2>
                <span className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded-full font-semibold">
                  {archived.length}
                </span>
              </div>
              <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">ID</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Category</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Payment</th>
                      <th className="text-left px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-3 text-light-grey font-medium text-xs uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archived.map((e, i) => (
                      <tr key={e.id} className={`hover:bg-muted transition-colors opacity-75 ${i < archived.length - 1 ? 'border-b border-border' : ''}`}>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">
                          {e.receiptDate ? format(new Date(e.receiptDate), 'dd.MM.yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-light-grey text-xs font-mono">#{e.sequentialId}</td>
                        <td className="px-4 py-3.5 text-dark-slate">{e.description ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          {e.category?.name ? (
                            <span className="bg-secondary text-slate-brand text-xs px-2 py-0.5 rounded-full">{e.category.name}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">{e.paymentMethod?.name ?? '—'}</td>
                        <td className="px-4 py-3.5"><ExpenseStatusBadge status={e.status} /></td>
                        <td className="px-4 py-3.5 text-right font-bold text-dark-slate">
                          {Number(e.amount).toLocaleString('da-DK', { minimumFractionDigits: 2 })} <span className="font-normal text-light-grey text-xs">{e.currency}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
