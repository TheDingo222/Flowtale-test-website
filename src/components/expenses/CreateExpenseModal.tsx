'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, X, FileText } from 'lucide-react'

interface Category { id: string; name: string }
interface PaymentMethod { id: string; name: string; isDefault: boolean }
interface Tag { id: string; name: string }

interface Props {
  categories: Category[]
  paymentMethods: PaymentMethod[]
  tags: Tag[]
}

const CURRENCIES = ['DKK', 'EUR', 'USD', 'GBP', 'SEK', 'NOK']

export default function CreateExpenseModal({ categories, paymentMethods, tags }: Props) {
  const t = useTranslations('expenses')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const defaultPM = paymentMethods.find((p) => p.isDefault)

  const [form, setForm] = useState({
    amount: '',
    currency: 'DKK',
    paymentMethodId: defaultPM?.id ?? '',
    categoryId: '',
    tagId: '',
    receiptDate: '',
    description: '',
  })

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  function resetForm() {
    setForm({
      amount: '',
      currency: 'DKK',
      paymentMethodId: defaultPM?.id ?? '',
      categoryId: '',
      tagId: '',
      receiptDate: '',
      description: '',
    })
    setFile(null)
    setError('')
  }

  async function handleSubmit(status: 'DRAFT' | 'PENDING') {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    setLoading(true)
    setError('')

    let receiptUrl = ''
    if (file) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Upload failed')
        setLoading(false)
        return
      }
      receiptUrl = data.url
    }

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(form.amount),
        currency: form.currency,
        paymentMethodId: form.paymentMethodId || null,
        categoryId: form.categoryId || null,
        tagId: form.tagId || null,
        receiptDate: form.receiptDate || null,
        description: form.description || undefined,
        receiptUrl: receiptUrl || undefined,
        status,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create expense')
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    resetForm()
    router.refresh()
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#00a8c8] hover:bg-[#0090aa] text-white"
      >
        {t('create')}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a3a4a]">Create Expense</DialogTitle>
          </DialogHeader>

          {/* File drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !file && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-[#00a8c8] bg-blue-50'
                : 'border-gray-200 hover:border-[#00a8c8] hover:bg-gray-50'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                <FileText size={16} className="text-[#00a8c8]" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} className="mx-auto text-[#00a8c8] mb-2" />
                <p className="text-sm text-gray-500">
                  Drag your files here, or{' '}
                  <span className="text-[#00a8c8] font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Accepts: JPG, PNG and PDF (max 10MB)</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">{t('amount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">{t('currency')}</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v ?? '' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600">{t('paymentMethod')}</Label>
              <Select
                value={form.paymentMethodId}
                onValueChange={(v) => setForm({ ...form, paymentMethodId: v ?? '' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-600">{t('receiptDate')}</Label>
              <Input
                type="date"
                value={form.receiptDate}
                onChange={(e) => setForm({ ...form, receiptDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-gray-600">{t('category')}</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v ?? '' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-600">{t('tag')}</Label>
              <Select
                value={form.tagId}
                onValueChange={(v) => setForm({ ...form, tagId: v ?? '' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-xs text-gray-600">{t('description')}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Add a note..."
                rows={3}
                className="mt-1 resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); resetForm() }}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit('DRAFT')}
              disabled={loading}
            >
              {t('saveDraft')}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit('PENDING')}
              disabled={!form.amount || loading}
              className="bg-[#00a8c8] hover:bg-[#0090aa] text-white"
            >
              {loading ? 'Saving...' : t('submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
