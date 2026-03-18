import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const actionSchema = z.object({
  expenseId: z.string(),
  action: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let expenses

  if (session.user.role === 'OWNER') {
    // Owners see all pending expenses
    expenses = await prisma.expense.findMany({
      where: { status: 'PENDING' },
      include: {
        user: true,
        category: true,
        paymentMethod: true,
        tag: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } else {
    // Regular users see expenses of users they are assigned to approve
    const chains = await prisma.approvalChain.findMany({
      where: { approverId: session.user.id },
      select: { userId: true },
    })
    const userIds = chains.map((c) => c.userId)

    expenses = await prisma.expense.findMany({
      where: {
        status: 'PENDING',
        userId: { in: userIds },
      },
      include: {
        user: true,
        category: true,
        paymentMethod: true,
        tag: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  return NextResponse.json(expenses)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { expenseId, action, comment } = parsed.data

  // Verify the expense exists and is pending
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } })
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  if (expense.status !== 'PENDING') {
    return NextResponse.json({ error: 'Expense is not pending' }, { status: 400 })
  }

  // Check authorization
  if (session.user.role !== 'OWNER') {
    const chain = await prisma.approvalChain.findFirst({
      where: { approverId: session.user.id, userId: expense.userId },
    })
    if (!chain) {
      return NextResponse.json({ error: 'Not authorized to approve this expense' }, { status: 403 })
    }
  }

  // Record approval and update expense status in a transaction
  await prisma.$transaction([
    prisma.approval.create({
      data: {
        expenseId,
        approverId: session.user.id,
        status: action,
        comment: comment ?? null,
        actedAt: new Date(),
      },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: { status: action },
    }),
  ])

  return NextResponse.json({ ok: true })
}
