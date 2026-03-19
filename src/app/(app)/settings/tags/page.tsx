'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'

interface Tag { id: string; name: string; period: string | null; _count: { expenses: number } }

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', period: '' })

  useEffect(() => {
    fetch('/api/settings/tags').then(r => r.json()).then(setTags)
  }, [])

  async function addTag(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/settings/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, period: form.period || undefined }),
    })
    const tag = await res.json()
    setTags(prev => [...prev, { ...tag, _count: { expenses: 0 } }])
    setAdding(false)
    setForm({ name: '', period: '' })
  }

  async function deleteTag(id: string) {
    await fetch(`/api/settings/tags/${id}`, { method: 'DELETE' })
    setTags(prev => prev.filter(t => t.id !== id))
  }

  // Group by period
  const grouped = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    const key = tag.period ?? 'No period'
    if (!acc[key]) acc[key] = []
    acc[key].push(tag)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-navy">Tags</h1>
        <Button onClick={() => setAdding(true)} className="bg-coral hover:bg-coral-hover text-white">
          Add Tag
        </Button>
      </div>

      {adding && (
        <form onSubmit={addTag} className="bg-card border border-border rounded-lg p-4 mb-4 flex gap-3 items-end">
          <div>
            <Label className="text-xs">Tag Name *</Label>
            <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 h-8 w-48" />
          </div>
          <div>
            <Label className="text-xs">Period (optional)</Label>
            <Input value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} className="mt-1 h-8 w-32" placeholder="e.g. 202501" />
          </div>
          <Button type="submit" className="bg-coral hover:bg-coral-hover text-white h-8">Save</Button>
          <Button type="button" variant="outline" onClick={() => setAdding(false)} className="h-8">Cancel</Button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4">
        {Object.entries(grouped).map(([period, periodTags]) => (
          <div key={period} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-cyan">+</span>
              <h3 className="font-medium text-sm text-navy">{period}</h3>
            </div>
            <div className="space-y-1.5">
              {periodTags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between text-sm">
                  <span className="text-dark-slate">{tag.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-light-grey">{tag._count.expenses} expenses</span>
                    {tag._count.expenses === 0 && (
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
