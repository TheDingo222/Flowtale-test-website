import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  paymentMethodId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tagId: z.string().optional().nullable(),
  receiptDate: z.string().optional().nullable(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { category: true, paymentMethod: true, tag: true, user: true, approvals: { include: { approver: true } } },
  })

  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expense.userId !== session.user.id && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(expense)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (expense.userId !== session.user.id && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...data,
      receiptDate: data.receiptDate ? new Date(data.receiptDate) : data.receiptDate === null ? null : undefined,
    },
    include: { category: true, paymentMethod: true, tag: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (expense.userId !== session.user.id && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only allow deleting DRAFT expenses
  if (expense.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Only draft expenses can be deleted' },
      { status: 400 },
    )
  }

  await prisma.expense.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
