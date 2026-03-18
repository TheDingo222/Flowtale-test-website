import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(1), period: z.string().optional() })

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { expenses: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(tags)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const tag = await prisma.tag.create({ data: parsed.data })
  return NextResponse.json(tag, { status: 201 })
}
