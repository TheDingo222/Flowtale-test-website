'use client'
import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface User { id: string; name: string; initials: string }
interface Chain { id: string; user: User; approver: User }

export default function ApprovalSettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/settings/approvals')
      .then(r => r.json())
      .then(data => { setUsers(data.users ?? []); setChains(data.chains ?? []) })
  }, [])

  function getApprover(userId: string): string {
    return chains.find(c => c.user.id === userId)?.approver.id ?? ''
  }

  async function setApprover(userId: string, approverId: string) {
    setSaving(prev => ({ ...prev, [userId]: true }))
    const res = await fetch('/api/settings/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, approverId }),
    })
    if (res.ok) {
      const chain = await res.json()
      const approver = users.find(u => u.id === approverId)!
      const user = users.find(u => u.id === userId)!
      setChains(prev => [
        ...prev.filter(c => c.user.id !== userId),
        { ...chain, user, approver },
      ])
    }
    setSaving(prev => ({ ...prev, [userId]: false }))
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Approval Settings</h1>
      <p className="text-sm text-gray-500 mb-6">Assign an approver for each user. When a user submits an expense, it will be sent to their assigned approver.</p>

      <div className="bg-white rounded-lg border divide-y">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#00a8c8] text-white text-xs font-semibold">
                {user.initials || user.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-medium text-sm">{user.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Approver:</span>
              <Select
                value={getApprover(user.id)}
                onValueChange={(v) => setApprover(user.id, v ?? '')}
                disabled={saving[user.id]}
              >
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue placeholder="Select approver..." />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.id !== user.id).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
