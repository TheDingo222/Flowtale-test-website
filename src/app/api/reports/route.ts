import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reports = await prisma.expenseReport.findMany({
    include: {
      createdBy: { select: { name: true, initials: true } },
      expenses: {
        include: {
          expense: {
            include: {
              user: { select: { name: true, initials: true } },
              paymentMethod: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(reports)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { dateFrom, dateTo } = await req.json()

  // Find all approved expenses in the date range
  const expenses = await prisma.expense.findMany({
    where: {
      status: 'APPROVED',
      receiptDate: {
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lte: dateTo ? new Date(dateTo) : undefined,
      },
    },
  })

  const report = await prisma.expenseReport.create({
    data: {
      createdById: session.user.id,
      dateFrom: dateFrom ? new Date(dateFrom) : new Date(),
      dateTo: dateTo ? new Date(dateTo) : new Date(),
      expenses: {
        create: expenses.map((e) => ({ expenseId: e.id })),
      },
    },
    include: {
      createdBy: { select: { name: true, initials: true } },
      expenses: { include: { expense: true } },
    },
  })

  return NextResponse.json(report, { status: 201 })
}
