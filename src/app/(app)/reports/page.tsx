'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Download, Plus } from 'lucide-react'
import { format } from 'date-fns'

interface Report {
  id: string
  dateFrom: string
  dateTo: string
  status: string
  exportedAt: string | null
  createdAt: string
  createdBy: { name: string; initials: string }
  expenses: { expense: { amount: number; currency: string; user: { name: string } } }[]
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [creating, setCreating] = useState(false)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(data => {
      setReports(Array.isArray(data) ? data : [])
    })
  }, [])

  async function createReport(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateFrom: dateRange.from, dateTo: dateRange.to }),
    })
    if (res.ok) {
      const report = await res.json()
      setReports(prev => [report, ...prev])
      setCreating(false)
      setDateRange({ from: '', to: '' })
    }
    setLoading(false)
  }

  function getTotal(report: Report) {
    return report.expenses.reduce((s, r) => s + r.expense.amount, 0)
  }

  function getEmployeeCount(report: Report) {
    return new Set(report.expenses.map(r => r.expense.user?.name)).size
  }

  const active = reports.filter(r => r.status === 'active')
  const archived = reports.filter(r => r.status !== 'active')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-navy">Expense Reports</h1>
        <Button
          onClick={() => setCreating(true)}
          className="bg-coral hover:bg-coral-hover text-white gap-1.5"
        >
          <Plus size={15} />
          New Report
        </Button>
      </div>

      {creating && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6">
          <h2 className="font-medium text-sm text-dark-slate mb-3">Create New Report</h2>
          <form onSubmit={createReport} className="flex gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From</label>
              <Input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="h-8 w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <Input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="h-8 w-40" />
            </div>
            <Button type="submit" disabled={loading} className="bg-coral hover:bg-coral-hover text-white h-8">
              {loading ? 'Creating...' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreating(false)} className="h-8">Cancel</Button>
          </form>
          <p className="text-xs text-light-grey mt-2">Will include all approved expenses in the selected date range.</p>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-12 text-center text-light-grey">
          No expense reports yet.
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Active reports</h2>
              <div className="grid grid-cols-2 gap-4">
                {active.map(report => (
                  <ReportCard key={report.id} report={report} total={getTotal(report)} employees={getEmployeeCount(report)} />
                ))}
              </div>
            </div>
          )}
          {archived.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Archived reports</h2>
              <div className="grid grid-cols-2 gap-4">
                {archived.map(report => (
                  <ReportCard key={report.id} report={report} total={getTotal(report)} employees={getEmployeeCount(report)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReportCard({ report, total, employees }: { report: Report; total: number; employees: number }) {
  const currency = report.expenses[0]?.expense.currency ?? 'DKK'

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-xs border-0 ${report.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-secondary text-slate-brand'}`}
            >
              {report.status === 'active' ? 'Active' : 'Archived'}
            </Badge>
            {report.exportedAt && (
              <span className="text-xs text-light-grey">
                Exported {format(new Date(report.exportedAt), 'dd.MM.yyyy')}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2">
            <span>📅 {format(new Date(report.dateFrom), 'dd.MM.yyyy')} – {format(new Date(report.dateTo), 'dd.MM.yyyy')}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex gap-3">
            <span>👥 {employees} employee{employees !== 1 ? 's' : ''}</span>
            <span>🧾 {report.expenses.length} expense{report.expenses.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-navy">{total.toFixed(2)}</p>
          <p className="text-xs text-light-grey">{currency}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-xs text-light-grey">By {report.createdBy.name}</span>
        <a
          href={`/api/reports/${report.id}/export`}
          className="flex items-center gap-1.5 text-xs text-cyan hover:underline"
        >
          <Download size={12} />
          Export CSV
        </a>
      </div>
    </div>
  )
}
