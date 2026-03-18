'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Category {
  id: string; name: string; financeAccount: string | null; vatCode: string | null; active: boolean
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', financeAccount: '', vatCode: '' })

  useEffect(() => {
    fetch('/api/settings/categories').then(r => r.json()).then(setCategories)
  }, [])

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/settings/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, active: true }),
    })
    const cat = await res.json()
    setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
    setAdding(false)
    setForm({ name: '', financeAccount: '', vatCode: '' })
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/settings/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    setCategories(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c))
  }

  const active = categories.filter(c => c.active)
  const inactive = categories.filter(c => !c.active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
        <Button onClick={() => setAdding(true)} className="bg-[#00a8c8] hover:bg-[#0090aa] text-white">
          Add Category
        </Button>
      </div>

      {adding && (
        <form onSubmit={addCategory} className="bg-white border rounded-lg p-4 mb-4 flex gap-3 items-end flex-wrap">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 h-8 w-48" />
          </div>
          <div>
            <Label className="text-xs">Finance Account</Label>
            <Input value={form.financeAccount} onChange={e => setForm({ ...form, financeAccount: e.target.value })} className="mt-1 h-8 w-28" placeholder="e.g. 2241" />
          </div>
          <div>
            <Label className="text-xs">VAT Code</Label>
            <Input value={form.vatCode} onChange={e => setForm({ ...form, vatCode: e.target.value })} className="mt-1 h-8 w-24" placeholder="e.g. 25%" />
          </div>
          <Button type="submit" className="bg-[#00a8c8] hover:bg-[#0090aa] text-white h-8">Save</Button>
          <Button type="button" variant="outline" onClick={() => setAdding(false)} className="h-8">Cancel</Button>
        </form>
      )}

      {[{ label: 'Active categories', items: active }, { label: 'Inactive categories', items: inactive }].map(({ label, items }) =>
        items.length > 0 ? (
          <div key={label} className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</h2>
            <div className="grid grid-cols-2 gap-3">
              {items.map(cat => (
                <div key={cat.id} className="bg-white border rounded-lg p-3 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{cat.name}</p>
                    <div className="text-xs text-gray-400 mt-0.5 space-x-3">
                      {cat.financeAccount && <span>Account: {cat.financeAccount}</span>}
                      {cat.vatCode && <span>VAT: {cat.vatCode}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(cat.id, cat.active)}
                    className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 transition-colors ${
                      cat.active ? 'bg-green-400 border-green-400' : 'bg-gray-200 border-gray-300'
                    }`}
                    title={cat.active ? 'Deactivate' : 'Activate'}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}
