import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const isOwner = session.user.role === 'OWNER'

  const where: Record<string, unknown> = {
    status: { in: ['APPROVED', 'REJECTED'] },
  }

  if (!isOwner) {
    where.userId = session.user.id
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { category: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, initials: true } },
      category: true,
      paymentMethod: true,
      tag: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return NextResponse.json(expenses)
}
