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
  const { lockedBeforeDate } = await req.json()
  const existing = await prisma.accountingPeriod.findFirst()
  const period = existing
    ? await prisma.accountingPeriod.update({
        where: { id: existing.id },
        data: { lockedBeforeDate: lockedBeforeDate ? new Date(lockedBeforeDate) : null },
      })
    : await prisma.accountingPeriod.create({
        data: { lockedBeforeDate: lockedBeforeDate ? new Date(lockedBeforeDate) : null },
      })
  return NextResponse.json(period)
}
