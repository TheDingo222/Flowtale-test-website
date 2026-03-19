'use client'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import AddUserModal from '@/components/settings/AddUserModal'

interface User {
  id: string; name: string; email: string; initials: string; role: string; status: string
}

async function toggleStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE'
  await fetch(`/api/settings/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  })
  return newStatus
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/users')
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false) })
  }, [])

  const active = users.filter((u) => u.status === 'ACTIVE')
  const deactivated = users.filter((u) => u.status !== 'ACTIVE')

  function handleUserAdded(user: User) {
    setUsers((prev) => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function handleToggle(user: User) {
    const newStatus = await toggleStatus(user.id, user.status)
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u))
  }

  if (loading) return <div className="text-light-grey text-sm p-8 text-center">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-navy">Users</h1>
        <AddUserModal onUserAdded={handleUserAdded} />
      </div>

      {[
        { label: 'Active users', items: active },
        { label: 'Deactivated users', items: deactivated },
      ].map(({ label, items }) =>
        items.length > 0 ? (
          <div key={label} className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {label}
            </h2>
            <div className="bg-card rounded-lg border border-border divide-y">
              {items.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-coral text-white text-xs font-semibold">
                      {u.initials || u.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-sm text-navy">{u.name}</p>
                      <p className="text-xs text-light-grey">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{u.role}</Badge>
                    <button
                      onClick={() => handleToggle(u)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        u.status === 'ACTIVE'
                          ? 'border-red-200 text-red-500 hover:bg-red-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}
