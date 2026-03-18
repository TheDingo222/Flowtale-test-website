import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const report = await prisma.expenseReport.findUnique({
    where: { id },
    include: {
      expenses: {
        include: {
          expense: {
            include: {
              user: true,
              category: true,
              paymentMethod: true,
              tag: true,
            },
          },
        },
      },
    },
  })

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Generate CSV
  const headers = ['Date', 'ID', 'User', 'Description', 'Category', 'Tag', 'Payment Method', 'Amount', 'Currency', 'Status']
  const rows = report.expenses.map(({ expense: e }) => [
    e.receiptDate ? format(new Date(e.receiptDate), 'dd.MM.yyyy') : '',
    `#${e.sequentialId}`,
    e.user.name,
    e.description ?? '',
    e.category?.name ?? '',
    e.tag?.name ?? '',
    e.paymentMethod?.name ?? '',
    e.amount.toFixed(2),
    e.currency,
    e.status,
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="report-${id.slice(0, 8)}.csv"`,
    },
  })
}
