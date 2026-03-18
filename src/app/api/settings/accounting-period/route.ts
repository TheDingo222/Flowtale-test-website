import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const period = await prisma.accountingPeriod.findFirst()
  return NextResponse.json(period)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  let body: { lockedBeforeDate?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { lockedBeforeDate } = body
  let parsedDate: Date | null = null
  if (lockedBeforeDate) {
    parsedDate = new Date(lockedBeforeDate)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
  }

  const existing = await prisma.accountingPeriod.findFirst()
  const period = existing
    ? await prisma.accountingPeriod.update({
        where: { id: existing.id },
        data: { lockedBeforeDate: parsedDate },
      })
    : await prisma.accountingPeriod.create({
        data: { lockedBeforeDate: parsedDate },
      })
  return NextResponse.json(period)
}
