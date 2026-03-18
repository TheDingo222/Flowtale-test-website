'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ProfilePage() {
  const [form, setForm] = useState({
    name: '', initials: '', language: 'en', phone: '', bankAccount: '',
    defaultPaymentMethodId: '', defaultCategoryId: '',
  })
  const [password, setPassword] = useState({ newPassword: '', confirm: '' })
  const [saved, setSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(data => {
      if (data) setForm({
        name: data.name ?? '',
        initials: data.initials ?? '',
        language: data.language ?? 'en',
        phone: data.phone ?? '',
        bankAccount: data.bankAccount ?? '',
        defaultPaymentMethodId: data.defaultPaymentMethodId ?? '',
        defaultCategoryId: data.defaultCategoryId ?? '',
      })
    })
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    if (form.language) {
      document.cookie = `locale=${form.language}; path=/; max-age=31536000; SameSite=Lax`
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (password.newPassword !== password.confirm) {
      setPwError('Passwords do not match')
      return
    }
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: password.newPassword }),
    })
    if (res.ok) {
      setPwSaved(true)
      setPassword({ newPassword: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>

      {/* Personal info */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Personal Information</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Initials</Label>
              <Input value={form.initials} maxLength={3} onChange={e => setForm({ ...form, initials: e.target.value.toUpperCase() })} className="mt-1" placeholder="e.g. MT" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Language</Label>
              <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="da">Dansk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Bank Account Number</Label>
              <Input value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} className="mt-1" placeholder="e.g. 3121-12345678" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" className="bg-[#00a8c8] hover:bg-[#0090aa] text-white">Save Changes</Button>
            {saved && <span className="text-green-600 text-sm">Saved!</span>}
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Change Password</h2>
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <Label>New Password</Label>
            <Input type="password" minLength={8} value={password.newPassword} onChange={e => setPassword({ ...password, newPassword: e.target.value })} className="mt-1" placeholder="Min. 8 characters" />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} className="mt-1" />
          </div>
          {pwError && <p className="text-red-500 text-sm">{pwError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="outline">Update Password</Button>
            {pwSaved && <span className="text-green-600 text-sm">Password updated!</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
