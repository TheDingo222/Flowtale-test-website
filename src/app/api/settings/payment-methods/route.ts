import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  financeAccount: z.string().optional(),
  type: z.enum(['STANDARD', 'REIMBURSABLE']),
  isDefault: z.boolean().default(false),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const pm = await prisma.paymentMethod.create({ data: parsed.data })
  return NextResponse.json(pm, { status: 201 })
}
