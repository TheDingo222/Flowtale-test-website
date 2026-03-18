import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  userId: z.string(),
  approverId: z.string(),
})

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const [chains, users] = await Promise.all([
    prisma.approvalChain.findMany({ include: { user: true, approver: true } }),
    prisma.user.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, initials: true } }),
  ])
  return NextResponse.json({ chains, users })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  // Remove existing chain for this user first (replace pattern)
  await prisma.approvalChain.deleteMany({ where: { userId: parsed.data.userId } })
  const chain = await prisma.approvalChain.create({ data: parsed.data })
  return NextResponse.json(chain, { status: 201 })
}
