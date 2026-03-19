import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import Tesseract from 'tesseract.js'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const { data: { text } } = await Tesseract.recognize(buffer, 'eng+dan', {
      logger: () => {},
    })

    // Extract amount — matches patterns like 125,00 / 1.250,00 / 99.99
    let amount = ''
    const amountPatterns = [
      /total[:\s]+(\d{1,6}[.,]\d{2})/i,
      /i alt[:\s]+(\d{1,6}[.,]\d{2})/i,
      /(\d{1,6}[.,]\d{2})\s*(kr\.?|dkk|eur|usd|,-)/i,
      /(\d{1,4}[.,]\d{3}[.,]\d{2})/,  // 1.250,00
    ]
    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match) {
        // Normalize: remove thousand separators, use dot as decimal
        amount = match[1].replace(/\./g, '').replace(',', '.')
        break
      }
    }

    // Extract date — matches dd/mm/yyyy, dd.mm.yyyy, dd-mm-yyyy
    let receiptDate = ''
    const dateMatch = text.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/)
    if (dateMatch) {
      const [, d, m, y] = dateMatch
      const year = y.length === 2 ? '20' + y : y
      receiptDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    // Extract description — first non-empty line that looks like a business name
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 3)
    const description = lines[0] ?? ''

    return NextResponse.json({ amount, receiptDate, description })
  } catch {
    return NextResponse.json({ amount: '', receiptDate: '', description: '' })
  }
}
