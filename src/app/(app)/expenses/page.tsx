import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { format } from 'date-fns'
import ExpenseStatusBadge from '@/components/expenses/ExpenseStatusBadge'
import CreateExpenseModal from '@/components/expenses/CreateExpenseModal'

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit expenses or edit existing ones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="border rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            {t('filter')}
          </button>
          <CreateExpenseModal
            categories={categories}
            paymentMethods={paymentMethods}
            tags={tags}
          />
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-400">
          {t('noExpenses')}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending / Draft section */}
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Pending
                </span>
                <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {pending.length}
                </span>
              </div>
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Date</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">ID</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Description</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Category</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Payment</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Status</th>
                      <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pending.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {e.receiptDate ? format(new Date(e.receiptDate), 'dd.MM.yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">#{e.sequentialId}</td>
                        <td className="px-4 py-3 text-gray-800">{e.description ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{e.category?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{e.paymentMethod?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <ExpenseStatusBadge status={e.status} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {e.amount.toFixed(2)} {e.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Archive section */}
          {archived.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Archived
                </span>
              </div>
              <div className="bg-white rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Date</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">ID</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Description</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Category</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Payment</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Status</th>
                      <th className="text-right px-4 py-2.5 text-gray-500 font-medium text-xs uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {archived.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {e.receiptDate ? format(new Date(e.receiptDate), 'dd.MM.yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">#{e.sequentialId}</td>
                        <td className="px-4 py-3 text-gray-800">{e.description ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{e.category?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{e.paymentMethod?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <ExpenseStatusBadge status={e.status} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {e.amount.toFixed(2)} {e.currency}
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
