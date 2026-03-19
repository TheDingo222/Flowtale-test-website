'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AccountingPeriodPage() {
  const [date, setDate] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/accounting-period')
      .then(r => r.json())
      .then(data => {
        if (data?.lockedBeforeDate) {
          setDate(new Date(data.lockedBeforeDate).toISOString().split('T')[0])
        }
      })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/settings/accounting-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lockedBeforeDate: date || null }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-2">Accounting Period Limit</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Set a date before which no expenses can be added, edited, or approved.
        Leave empty to allow all dates.
      </p>

      <div className="bg-card rounded-lg border border-border p-6 max-w-md">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-dark-slate block mb-1">
              Lock expenses before this date
            </label>
            <p className="text-xs text-light-grey mb-2">
              You will not be able to add, edit, or approve expenses dated before the selected date.
            </p>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" className="bg-coral hover:bg-coral-hover text-white">
              Save Changes
            </Button>
            {saved && <span className="text-green-600 text-sm">Saved!</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
