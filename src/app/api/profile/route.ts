import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.object({
  name: z.string().min(1).optional(),
  initials: z.string().max(3).optional(),
  language: z.enum(['en', 'da']).optional(),
  bankAccount: z.string().optional(),
  phone: z.string().optional(),
  defaultPaymentMethodId: z.string().optional().nullable(),
  defaultCategoryId: z.string().optional().nullable(),
  newPassword: z.string().min(8).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, initials: true, language: true,
      bankAccount: true, phone: true, defaultPaymentMethodId: true, defaultCategoryId: true,
    },
  })
  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { newPassword, ...data } = parsed.data
  const updateData: Record<string, unknown> = { ...data }
  if (newPassword) {
    updateData.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  const headers = new Headers()
  if (data.language) {
    headers.append('Set-Cookie', `locale=${data.language}; path=/; max-age=31536000; SameSite=Lax`)
  }

  return NextResponse.json({ ok: true, name: user.name }, { headers })
}
