import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Admin user
  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@company.com',
      passwordHash: hash,
      initials: 'AD',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  })

  // Default payment methods
  await prisma.paymentMethod.createMany({
    data: [
      { name: 'Company Card', type: 'STANDARD', isDefault: true, financeAccount: '5825' },
      { name: 'Personal Outlay', type: 'REIMBURSABLE', isDefault: false, financeAccount: '6835' },
    ],
    skipDuplicates: true,
  })

  // Default categories
  await prisma.category.createMany({
    data: [
      { name: 'Meals', financeAccount: '2241', vatCode: '25%' },
      { name: 'Restaurant / client meals', financeAccount: '2751', vatCode: '25%' },
      { name: 'Transport', financeAccount: '2770', vatCode: '25%' },
      { name: 'IT software / subscriptions', financeAccount: '3604', vatCode: '25%' },
      { name: 'Internet', financeAccount: '3621', vatCode: '25%' },
      { name: 'Office supplies', financeAccount: '2800', vatCode: '25%' },
      { name: 'Accommodation', financeAccount: '2760', vatCode: '25%' },
      { name: 'Other', financeAccount: '9999', vatCode: '25%' },
    ],
    skipDuplicates: true,
  })

  // Default tags
  await prisma.tag.createMany({
    data: [
      { name: 'Clients', period: 'Clients' },
      { name: 'IT', period: 'IT' },
    ],
    skipDuplicates: true,
  })

  console.log('Seed complete. Login: admin@company.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
