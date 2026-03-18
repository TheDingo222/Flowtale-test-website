import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  let body: { dateFrom?: string; dateTo?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { dateFrom, dateTo } = body
  const parsedFrom = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const parsedTo = dateTo ? new Date(dateTo) : new Date()

  if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  // Find all approved expenses in the date range
  const expenses = await prisma.expense.findMany({
    where: {
      status: 'APPROVED',
      receiptDate: {
        gte: dateFrom ? parsedFrom : undefined,
        lte: dateTo ? parsedTo : undefined,
      },
    },
  })

  const report = await prisma.expenseReport.create({
    data: {
      createdById: session.user.id,
      dateFrom: parsedFrom,
      dateTo: parsedTo,
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
