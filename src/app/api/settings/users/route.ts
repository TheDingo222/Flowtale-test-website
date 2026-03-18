import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['OWNER', 'USER']).default('USER'),
  password: z.string().min(8),
})

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, email: true, initials: true,
      role: true, status: true, createdAt: true,
    },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  const hash = await bcrypt.hash(parsed.data.password, 12)
  const nameParts = parsed.data.name.trim().split(' ')
  const initials = nameParts.map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: hash,
      initials,
      role: parsed.data.role,
      status: 'ACTIVE',
    },
    select: { id: true, name: true, email: true, initials: true, role: true, status: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
