'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
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
import { Upload, X, FileText, Image as ImageIcon, Sparkles, Loader2, QrCode } from 'lucide-react'

interface Category { id: string; name: string }
interface PaymentMethod { id: string; name: string; isDefault: boolean }
interface Tag { id: string; name: string }

interface Props {
  categories: Category[]
  paymentMethods: PaymentMethod[]
  tags: Tag[]
}

const CURRENCIES = ['DKK', 'EUR', 'USD', 'GBP', 'SEK', 'NOK']

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const selectClass = "mt-1 w-full border border-border rounded-md px-3 py-2 text-sm bg-card text-navy focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan"

export default function CreateExpenseModal({ categories, paymentMethods, tags }: Props) {
  const t = useTranslations('expenses')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrData, setQrData] = useState<{ dataUrl: string; url: string } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ocring, setOcring] = useState(false)
  const [error, setError] = useState('')
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())

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

  // Open modal if URL has ?create=true (for QR code flow)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('create') === 'true') {
        setOpen(true)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  // Generate image preview
  useEffect(() => {
    if (!file) { setPreview(null); return }
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreview(null)
  }, [file])

  async function runOcr(selectedFile: File) {
    if (!selectedFile.type.startsWith('image/')) return
    setOcring(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      if (!res.ok) return
      const data = await res.json()
      const filled = new Set<string>()
      setForm((prev) => {
        const next = { ...prev }
        if (data.amount && !prev.amount) { next.amount = data.amount; filled.add('amount') }
        if (data.receiptDate && !prev.receiptDate) { next.receiptDate = data.receiptDate; filled.add('receiptDate') }
        if (data.description && !prev.description) { next.description = data.description; filled.add('description') }
        return next
      })
      setAutoFilled(filled)
    } finally {
      setOcring(false)
      setTimeout(() => amountRef.current?.focus(), 100)
    }
  }

  function handleFileSelect(selected: File) {
    setFile(selected)
    setAutoFilled(new Set())
    runOcr(selected)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
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
    setPreview(null)
    setError('')
    setAutoFilled(new Set())
  }

  async function loadQr() {
    if (qrData) { setQrOpen(true); return }
    const res = await fetch('/api/qrcode')
    if (res.ok) {
      const data = await res.json()
      setQrData(data)
    }
    setQrOpen(true)
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
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={loadQr}
          className="border-border text-muted-foreground hover:text-navy"
          title="Upload from phone"
        >
          <QrCode size={15} />
        </Button>
        <Button
          onClick={() => setOpen(true)}
          className="bg-coral hover:bg-coral-hover text-white"
        >
          {t('create')}
        </Button>
      </div>

      {/* QR Code Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-navy">Upload from phone</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Scan this QR code with your phone to open the receipt upload form directly.
          </p>
          {qrData ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrData.dataUrl} alt="QR Code" className="w-48 h-48" />
              <p className="text-xs text-light-grey break-all">{qrData.url}</p>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-cyan" size={32} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Expense Modal */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-navy">Create Expense</DialogTitle>
          </DialogHeader>

          {/* File drop zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-cyan bg-cyan-50 scale-[1.01]'
                  : 'border-border hover:border-cyan hover:bg-muted'
              }`}
            >
              <Upload size={32} className="mx-auto text-cyan mb-3" />
              <p className="text-sm font-medium text-dark-slate">
                Drag your receipt here, or{' '}
                <span className="text-cyan">browse</span>
              </p>
              <p className="text-xs text-light-grey mt-1">JPG, PNG or PDF — max 10MB</p>
              <p className="text-xs text-cyan mt-2 font-medium">
                ✨ Amount and date will be filled in automatically
              </p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden bg-muted">
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Receipt" className="w-full max-h-52 object-contain bg-card" />
                  <button
                    type="button"
                    onClick={() => { setFile(null); setPreview(null) }}
                    className="absolute top-2 right-2 bg-card rounded-full p-1.5 shadow-md text-light-grey hover:text-red-500 transition-colors"
                  >
                    <X size={13} />
                  </button>
                  {ocring && (
                    <div className="absolute inset-0 bg-card/70 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-cyan" size={28} />
                      <p className="text-sm font-medium text-navy">Reading receipt...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 flex items-center gap-3">
                  <FileText size={20} className="text-cyan shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-slate truncate font-medium">{file.name}</p>
                    <p className="text-xs text-light-grey">{formatFileSize(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="text-light-grey hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              )}
              {preview && !ocring && (
                <div className="px-3 py-2 bg-card border-t flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon size={12} className="text-cyan" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span>{formatFileSize(file.size)}</span>
                  <button onClick={() => fileInputRef.current?.click()} className="text-cyan hover:underline ml-1">
                    Change
                  </button>
                </div>
              )}
              {autoFilled.size > 0 && !ocring && (
                <div className="px-3 py-2 bg-cyan-50 border-t flex items-center gap-2 text-xs text-cyan font-medium">
                  <Sparkles size={12} />
                  Fields auto-filled from receipt — please verify
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />

          {/* Form */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-slate-brand">{t('amount')}</Label>
              <div className="relative mt-1">
                <Input
                  ref={amountRef}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className={autoFilled.has('amount') ? 'border-cyan-300 bg-cyan-50' : ''}
                />
                {autoFilled.has('amount') && (
                  <Sparkles size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan" />
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-brand">{t('currency')}</Label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={selectClass}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-brand">{t('paymentMethod')}</Label>
              <select
                value={form.paymentMethodId}
                onChange={(e) => setForm({ ...form, paymentMethodId: e.target.value })}
                className={selectClass}
              >
                <option value="">Select...</option>
                {paymentMethods.map((pm) => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-brand">{t('receiptDate')}</Label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={form.receiptDate}
                  onChange={(e) => setForm({ ...form, receiptDate: e.target.value })}
                  className={autoFilled.has('receiptDate') ? 'border-cyan-300 bg-cyan-50' : ''}
                />
                {autoFilled.has('receiptDate') && (
                  <Sparkles size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan" />
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-brand">{t('category')}</Label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className={selectClass}
              >
                <option value="">Select...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-brand">{t('tag')}</Label>
              <select
                value={form.tagId}
                onChange={(e) => setForm({ ...form, tagId: e.target.value })}
                className={selectClass}
              >
                <option value="">Select tag...</option>
                {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <Label className="text-xs font-medium text-slate-brand">{t('description')}</Label>
              <div className="relative mt-1">
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Add a note..."
                  rows={2}
                  className={`resize-none ${autoFilled.has('description') ? 'border-cyan-300 bg-cyan-50' : ''}`}
                />
                {autoFilled.has('description') && (
                  <Sparkles size={12} className="absolute right-2.5 top-2.5 text-cyan" />
                )}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" type="button" onClick={() => { setOpen(false); resetForm() }}>
              {t('cancel')}
            </Button>
            <Button variant="outline" type="button" onClick={() => handleSubmit('DRAFT')} disabled={loading}>
              {t('saveDraft')}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit('PENDING')}
              disabled={!form.amount || loading}
              className="bg-coral hover:bg-coral-hover text-white"
            >
              {loading ? <><Loader2 size={14} className="animate-spin mr-1.5" />Saving...</> : t('submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
