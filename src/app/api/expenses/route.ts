import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('DKK'),
  paymentMethodId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tagId: z.string().optional().nullable(),
  receiptDate: z.string().optional().nullable(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING']).default('DRAFT'),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get('status')

  const where: Record<string, unknown> = {
    userId: session.user.id,
  }

  if (statusFilter) {
    where.status = statusFilter
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: true,
      tag: true,
      paymentMethod: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(expenses)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check accounting period lock
  const period = await prisma.accountingPeriod.findFirst()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data

  if (period?.lockedBeforeDate && data.receiptDate) {
    const receiptDate = new Date(data.receiptDate)
    if (receiptDate < period.lockedBeforeDate) {
      return NextResponse.json(
        { error: 'Receipt date is before the locked accounting period' },
        { status: 400 },
      )
    }
  }

  const expense = await prisma.expense.create({
    data: {
      userId: session.user.id,
      amount: data.amount,
      currency: data.currency,
      paymentMethodId: data.paymentMethodId ?? null,
      categoryId: data.categoryId ?? null,
      tagId: data.tagId ?? null,
      receiptDate: data.receiptDate ? new Date(data.receiptDate) : null,
      description: data.description,
      receiptUrl: data.receiptUrl,
      status: data.status,
    },
    include: { category: true, paymentMethod: true, tag: true },
  })

  return NextResponse.json(expense, { status: 201 })
}
