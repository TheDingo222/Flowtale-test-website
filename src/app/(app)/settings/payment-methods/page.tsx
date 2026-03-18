'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface PaymentMethod {
  id: string; name: string; financeAccount: string | null; type: string; isDefault: boolean
}

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', financeAccount: '', type: 'STANDARD', isDefault: false })

  useEffect(() => {
    fetch('/api/settings/payment-methods').then(r => r.json()).then(setMethods)
  }, [])

  async function addMethod(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/settings/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const pm = await res.json()
    setMethods(prev => [...prev, pm])
    setAdding(false)
    setForm({ name: '', financeAccount: '', type: 'STANDARD', isDefault: false })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Payment Methods</h1>
        <Button onClick={() => setAdding(true)} className="bg-[#00a8c8] hover:bg-[#0090aa] text-white">
          Add Payment Method
        </Button>
      </div>

      {adding && (
        <form onSubmit={addMethod} className="bg-white border rounded-lg p-4 mb-4 flex gap-3 items-end flex-wrap">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 h-8 w-48" />
          </div>
          <div>
            <Label className="text-xs">Finance Account</Label>
            <Input value={form.financeAccount} onChange={e => setForm({ ...form, financeAccount: e.target.value })} className="mt-1 h-8 w-28" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v ?? '' })}>
              <SelectTrigger className="mt-1 h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="REIMBURSABLE">Reimbursable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="bg-[#00a8c8] hover:bg-[#0090aa] text-white h-8">Save</Button>
          <Button type="button" variant="outline" onClick={() => setAdding(false)} className="h-8">Cancel</Button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4">
        {methods.map(pm => (
          <div key={pm.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <p className="font-medium text-gray-900">{pm.name}</p>
                  {pm.isDefault && <Badge className="text-xs bg-[#00a8c8] text-white border-0">Standard</Badge>}
                  {pm.type === 'REIMBURSABLE' && <Badge className="text-xs bg-orange-100 text-orange-700 border-0">Refundable</Badge>}
                </div>
                {pm.financeAccount && (
                  <p className="text-xs text-gray-400">Finance account: {pm.financeAccount}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
