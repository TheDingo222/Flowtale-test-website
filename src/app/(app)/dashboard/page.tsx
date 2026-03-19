import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import ExpenseLineChart from '@/components/dashboard/ExpenseLineChart'
import CategoryPieChart from '@/components/dashboard/CategoryPieChart'
import UserBarChart from '@/components/dashboard/UserBarChart'
import { getTranslations } from 'next-intl/server'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const t = await getTranslations('nav')
  const isOwner = session.user.role === 'OWNER'

  const [expenses, pendingCount, recentApprovals] = await Promise.all([
    prisma.expense.findMany({
      where: isOwner ? {} : { userId: session.user.id },
      include: { category: true, user: true },
      orderBy: { receiptDate: 'asc' },
    }),
    prisma.expense.count({ where: { status: 'PENDING' } }),
    prisma.approval.findMany({
      take: 8,
      orderBy: { actedAt: 'desc' },
      include: {
        expense: { include: { user: { select: { name: true, initials: true } } } },
        approver: { select: { name: true } },
      },
    }),
  ])

  // Line chart: daily totals
  const byDay: Record<string, number> = {}
  for (const e of expenses) {
    if (!e.receiptDate) continue
    const key = format(new Date(e.receiptDate), 'dd.MM')
    byDay[key] = (byDay[key] ?? 0) + e.amount
  }
  const lineData = Object.entries(byDay).map(([date, total]) => ({ date, total }))

  // Pie chart: by category (top 8)
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    const name = e.category?.name ?? 'Other'
    byCategory[name] = (byCategory[name] ?? 0) + e.amount
  }
  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Bar chart: by user (top 10)
  const byUser: Record<string, { name: string; total: number }> = {}
  for (const e of expenses) {
    const uid = e.userId
    if (!byUser[uid]) {
      byUser[uid] = { name: e.user.name.split(' ')[0], total: 0 }
    }
    byUser[uid].total += e.amount
  }
  const barData = Object.values(byUser)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)
  const currency = expenses[0]?.currency ?? 'DKK'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">{t('dashboard')}</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
          <p className="text-2xl font-bold text-navy mt-1">
            {totalAmount.toFixed(2)} {currency}
          </p>
          <p className="text-xs text-light-grey mt-1">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Approval</p>
          <p className="text-2xl font-bold text-cyan mt-1">{pendingCount}</p>
          <p className="text-xs text-light-grey mt-1">awaiting review</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Recent Approvals</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{recentApprovals.filter(a => a.status === 'APPROVED').length}</p>
          <p className="text-xs text-light-grey mt-1">of last {recentApprovals.length} actions</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Charts column */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Expenses over time</h2>
            <ExpenseLineChart data={lineData} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">By category</h2>
              <CategoryPieChart data={pieData} />
            </div>
            <div className="bg-card rounded-lg border p-4">
              <h2 className="text-sm font-semibold text-dark-slate mb-3">By employee</h2>
              <UserBarChart data={barData} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-dark-slate mb-3">Recent activity</h2>
            {recentApprovals.length === 0 ? (
              <p className="text-xs text-light-grey">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentApprovals.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${
                          a.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-coral'
                        }`}
                      >
                        {a.status === 'APPROVED' ? '✓' : '✗'}
                      </span>
                      <span className="text-dark-slate">{a.expense.user?.name.split(' ')[0]}</span>
                    </div>
                    <span className="text-light-grey">#{a.expense.sequentialId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
