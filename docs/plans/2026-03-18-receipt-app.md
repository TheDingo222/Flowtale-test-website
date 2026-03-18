# Receipt App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack expense/receipt management web app for 15 internal users with approval workflows, modelled after Outlay.

**Architecture:** Next.js 14 App Router with API routes as the backend, Prisma ORM against PostgreSQL, and Azure Blob Storage for receipt file uploads. NextAuth.js handles email/password auth with role-based access (owner/user).

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth.js v5, Azure Blob Storage (`@azure/storage-blob`), Tailwind CSS, shadcn/ui, Recharts, next-intl, Jest, React Testing Library, Docker.

---

## Task 1: Project Scaffold

**Files:**
- Create: `receipt-app/` (project root — run all commands from here)

**Step 1: Bootstrap Next.js project**

```bash
cd C:/Users/Micha
npx create-next-app@latest receipt-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
cd receipt-app
```

**Step 2: Install dependencies**

```bash
npm install \
  prisma @prisma/client \
  next-auth@beta \
  @auth/prisma-adapter \
  @azure/storage-blob \
  next-intl \
  recharts \
  bcryptjs \
  zod \
  @hookform/resolvers \
  react-hook-form \
  date-fns \
  lucide-react

npm install -D \
  @types/bcryptjs \
  jest \
  jest-environment-jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  ts-jest
```

**Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
# Choose: Default style, Slate base color, CSS variables: yes
npx shadcn@latest add button input label card table dialog dropdown-menu select textarea badge avatar tabs form toast sonner
```

**Step 4: Initialise Prisma**

```bash
npx prisma init
```

**Step 5: Create `.env.local`**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/receiptapp"
NEXTAUTH_SECRET="change-this-to-a-random-string-in-production"
NEXTAUTH_URL="http://localhost:3000"
AZURE_BLOB_ACCOUNT_NAME=""
AZURE_BLOB_ACCOUNT_KEY=""
AZURE_BLOB_CONTAINER_NAME="receipts"
EOF
```

**Step 6: Configure Jest — create `jest.config.ts`**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

**Step 7: Create `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

**Step 8: Add test script to `package.json`**

Add to the `scripts` section:
```json
"test": "jest",
"test:watch": "jest --watch"
```

**Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: initial Next.js project scaffold with dependencies"
```

---

## Task 2: Database Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Write the full Prisma schema**

Replace the contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  USER
}

enum UserStatus {
  ACTIVE
  PENDING
  DEACTIVATED
}

enum ExpenseStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
}

enum PaymentType {
  STANDARD
  REIMBURSABLE
}

model User {
  id                    String    @id @default(cuid())
  name                  String
  email                 String    @unique
  passwordHash          String
  initials              String    @default("")
  role                  Role      @default(USER)
  status                UserStatus @default(PENDING)
  language              String    @default("en")
  defaultPaymentMethodId String?
  defaultCategoryId     String?
  bankAccount           String?
  phone                 String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  expenses              Expense[]
  approvalChains        ApprovalChain[] @relation("UserChains")
  approverChains        ApprovalChain[] @relation("ApproverChains")
  approvals             Approval[]
  reportsCreated        ExpenseReport[]
}

model Expense {
  id              String        @id @default(cuid())
  sequentialId    Int           @default(autoincrement())
  userId          String
  amount          Float
  currency        String        @default("DKK")
  paymentMethodId String?
  categoryId      String?
  tagId           String?
  receiptDate     DateTime?
  description     String?
  receiptUrl      String?
  status          ExpenseStatus @default(DRAFT)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  user            User           @relation(fields: [userId], references: [id])
  paymentMethod   PaymentMethod? @relation(fields: [paymentMethodId], references: [id])
  category        Category?      @relation(fields: [categoryId], references: [id])
  tag             Tag?           @relation(fields: [tagId], references: [id])
  approvals       Approval[]
  reportExpenses  ReportExpense[]
}

model ApprovalChain {
  id          String @id @default(cuid())
  userId      String
  approverId  String
  order       Int    @default(0)

  user        User   @relation("UserChains", fields: [userId], references: [id])
  approver    User   @relation("ApproverChains", fields: [approverId], references: [id])
}

model Approval {
  id          String        @id @default(cuid())
  expenseId   String
  approverId  String
  status      ExpenseStatus
  comment     String?
  actedAt     DateTime?
  createdAt   DateTime      @default(now())

  expense     Expense       @relation(fields: [expenseId], references: [id])
  approver    User          @relation(fields: [approverId], references: [id])
}

model Category {
  id              String    @id @default(cuid())
  name            String
  financeAccount  String?
  vatCode         String?
  active          Boolean   @default(true)
  createdAt       DateTime  @default(now())

  expenses        Expense[]
}

model Tag {
  id        String    @id @default(cuid())
  name      String
  period    String?
  createdAt DateTime  @default(now())

  expenses  Expense[]
}

model PaymentMethod {
  id              String      @id @default(cuid())
  name            String
  financeAccount  String?
  type            PaymentType @default(STANDARD)
  isDefault       Boolean     @default(false)
  createdAt       DateTime    @default(now())

  expenses        Expense[]
}

model ExpenseReport {
  id          String    @id @default(cuid())
  createdById String
  dateFrom    DateTime
  dateTo      DateTime
  status      String    @default("active")
  exportedAt  DateTime?
  createdAt   DateTime  @default(now())

  createdBy   User      @relation(fields: [createdById], references: [id])
  expenses    ReportExpense[]
}

model ReportExpense {
  reportId  String
  expenseId String

  report    ExpenseReport @relation(fields: [reportId], references: [id])
  expense   Expense       @relation(fields: [expenseId], references: [id])

  @@id([reportId, expenseId])
}

model AccountingPeriod {
  id                String   @id @default(cuid())
  lockedBeforeDate  DateTime?
  updatedAt         DateTime @updatedAt
}
```

**Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration created and applied. Prisma Client generated.

**Step 3: Create Prisma client singleton — `src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 4: Commit**

```bash
git add prisma/ src/lib/prisma.ts
git commit -m "feat: add Prisma schema and database migrations"
```

---

## Task 3: Auth Setup (NextAuth v5)

**Files:**
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/actions.ts`
- Create: `src/types/next-auth.d.ts`

**Step 1: Write the auth config — `src/auth.ts`**

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user || user.status === 'DEACTIVATED') return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
```

**Step 2: Create route handler — `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

**Step 3: Create middleware — `src/middleware.ts`**

```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

**Step 4: Extend NextAuth types — `src/types/next-auth.d.ts`**

```typescript
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }
}
```

**Step 5: Write failing test — `src/__tests__/auth.test.ts`**

```typescript
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
  })
})
```

**Step 6: Run tests**

```bash
npm test src/__tests__/auth.test.ts
```

Expected: 3 passing.

**Step 7: Create login page — `src/app/(auth)/login/page.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })
    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#1a3a4a]">Receipt App</CardTitle>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-[#00a8c8] hover:bg-[#0090aa]" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 8: Create seed script — `prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
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

  await prisma.paymentMethod.createMany({
    data: [
      { name: 'Company Card', type: 'STANDARD', isDefault: true },
      { name: 'Personal Outlay', type: 'REIMBURSABLE' },
    ],
    skipDuplicates: true,
  })

  console.log('Seed complete. Login: admin@company.com / admin123')
}

main().finally(() => prisma.$disconnect())
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

```bash
npm install -D ts-node
npx prisma db seed
```

**Step 9: Commit**

```bash
git add .
git commit -m "feat: add NextAuth credentials auth with login page and seed"
```

---

## Task 4: i18n Setup

**Files:**
- Create: `src/i18n/en.json`
- Create: `src/i18n/da.json`
- Create: `src/i18n/request.ts`
- Modify: `next.config.ts`

**Step 1: Create English translations — `src/i18n/en.json`**

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "expenses": "My Expenses",
    "approvals": "Approvals",
    "reports": "Expense Reports",
    "archive": "Archive",
    "settings": "Settings"
  },
  "auth": {
    "signIn": "Sign in",
    "signOut": "Sign out",
    "email": "Email",
    "password": "Password",
    "invalidCredentials": "Invalid email or password"
  },
  "expenses": {
    "title": "My Expenses",
    "create": "Create Expense",
    "noExpenses": "No expenses at this time.",
    "amount": "Amount",
    "currency": "Currency",
    "paymentMethod": "Payment Method",
    "category": "Category",
    "tag": "Tag",
    "receiptDate": "Receipt Date",
    "description": "Description",
    "saveDraft": "Save Draft",
    "submit": "Submit",
    "cancel": "Cancel",
    "status": {
      "DRAFT": "Draft",
      "PENDING": "Pending",
      "APPROVED": "Approved",
      "REJECTED": "Rejected"
    }
  },
  "approvals": {
    "title": "Approvals",
    "approve": "Approve",
    "reject": "Reject",
    "comment": "Comment",
    "noExpenses": "No expenses require approval at this time."
  },
  "archive": {
    "title": "Archive",
    "date": "Date",
    "id": "ID",
    "user": "User",
    "description": "Description",
    "category": "Category",
    "tags": "Tags",
    "paymentMethod": "Payment Method",
    "status": "Status",
    "amount": "Amount"
  },
  "settings": {
    "users": "Users",
    "categories": "Categories",
    "tags": "Tags",
    "paymentMethods": "Payment Methods",
    "approvalSettings": "Approval Settings",
    "accountingPeriod": "Accounting Period",
    "inviteUser": "Invite User",
    "addCategory": "Add Category",
    "addTag": "Add Tag",
    "addPaymentMethod": "Add Payment Method"
  },
  "profile": {
    "title": "My Profile",
    "save": "Save Changes",
    "firstName": "First Name",
    "lastName": "Last Name",
    "initials": "Initials",
    "language": "Language"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "filter": "Filter",
    "search": "Search",
    "loading": "Loading...",
    "active": "Active",
    "inactive": "Inactive"
  }
}
```

**Step 2: Create Danish translations — `src/i18n/da.json`**

```json
{
  "nav": {
    "dashboard": "Oversigt",
    "expenses": "Mine udgifter",
    "approvals": "Godkendelser",
    "reports": "Udgiftsrapporter",
    "archive": "Arkiv",
    "settings": "Indstillinger"
  },
  "auth": {
    "signIn": "Log ind",
    "signOut": "Log ud",
    "email": "E-mail",
    "password": "Adgangskode",
    "invalidCredentials": "Ugyldig e-mail eller adgangskode"
  },
  "expenses": {
    "title": "Mine udgifter",
    "create": "Opret ny udgift",
    "noExpenses": "Der er ingen udgifter på nuværende tidspunkt.",
    "amount": "Beløb",
    "currency": "Valuta",
    "paymentMethod": "Betalingsmetode",
    "category": "Kategori",
    "tag": "Tag",
    "receiptDate": "Kvitteringsdato",
    "description": "Beskrivelse",
    "saveDraft": "Gem kladde",
    "submit": "Send til bogholder",
    "cancel": "Annullér",
    "status": {
      "DRAFT": "Kladde",
      "PENDING": "Afventer",
      "APPROVED": "Godkendt",
      "REJECTED": "Afvist"
    }
  },
  "approvals": {
    "title": "Godkendelser",
    "approve": "Godkend",
    "reject": "Afvis",
    "comment": "Kommentar",
    "noExpenses": "Der er ingen udgifter på nuværende tidspunkt."
  },
  "archive": {
    "title": "Arkiv",
    "date": "Dato",
    "id": "ID",
    "user": "Bruger",
    "description": "Beskrivelse",
    "category": "Kategori/Projekt",
    "tags": "Tags",
    "paymentMethod": "Betalingsmetode",
    "status": "Status",
    "amount": "Beløb"
  },
  "settings": {
    "users": "Brugere",
    "categories": "Kategorier",
    "tags": "Tags",
    "paymentMethods": "Betalingsmetoder",
    "approvalSettings": "Godkendelsesindstillinger",
    "accountingPeriod": "Grænse for regnskabsperiode",
    "inviteUser": "Invitér bruger",
    "addCategory": "Tilføj kategori",
    "addTag": "Tilføj tag",
    "addPaymentMethod": "Tilføj betalingsmetode"
  },
  "profile": {
    "title": "Min profil",
    "save": "Gem ændringer",
    "firstName": "Fornavn",
    "lastName": "Efternavn",
    "initials": "Initialer",
    "language": "Sprog"
  },
  "common": {
    "save": "Gem",
    "cancel": "Annullér",
    "delete": "Slet",
    "edit": "Rediger",
    "filter": "Filtrer",
    "search": "Søg",
    "loading": "Indlæser...",
    "active": "Aktiv",
    "inactive": "Inaktiv"
  }
}
```

**Step 3: Create i18n request config — `src/i18n/request.ts`**

```typescript
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'en'

  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
  }
})
```

**Step 4: Update `next.config.ts`**

```typescript
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig = {}

export default withNextIntl(nextConfig)
```

**Step 5: Commit**

```bash
git add src/i18n/ next.config.ts
git commit -m "feat: add next-intl i18n with English and Danish translations"
```

---

## Task 5: App Layout & Navigation

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/LanguageSwitcher.tsx`
- Create: `src/app/(app)/dashboard/page.tsx` (placeholder)

**Step 1: Create app layout — `src/app/(app)/layout.tsx`**

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} />
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
```

**Step 2: Create Navbar — `src/components/layout/Navbar.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Bell, Settings, LogOut, User } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface NavbarProps {
  user: { id: string; name: string; email: string; role: string }
}

export default function Navbar({ user }: NavbarProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/expenses', label: t('expenses') },
    { href: '/approvals', label: t('approvals') },
    { href: '/reports', label: t('reports') },
    { href: '/archive', label: t('archive') },
  ]

  return (
    <nav className="bg-[#1a3a4a] text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg tracking-tight">Receipt App</span>
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user.role === 'OWNER' && (
              <Link
                href="/settings/users"
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  pathname.startsWith('/settings')
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {t('settings')}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button className="text-white/70 hover:text-white relative">
            <Bell size={20} />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="w-8 h-8 cursor-pointer">
                <AvatarFallback className="bg-[#00a8c8] text-white text-xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile"><User size={14} className="mr-2" />My Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
                <LogOut size={14} className="mr-2" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
```

**Step 3: Create LanguageSwitcher — `src/components/layout/LanguageSwitcher.tsx`**

```typescript
'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function LanguageSwitcher() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function switchLanguage(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000`
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-1 text-xs text-white/70">
      <button onClick={() => switchLanguage('en')} className="hover:text-white">EN</button>
      <span>/</span>
      <button onClick={() => switchLanguage('da')} className="hover:text-white">DA</button>
    </div>
  )
}
```

**Step 4: Create dashboard placeholder — `src/app/(app)/dashboard/page.tsx`**

```typescript
export default function DashboardPage() {
  return <div className="text-gray-500">Dashboard coming soon</div>
}
```

**Step 5: Update root redirect — `src/app/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/dashboard')
}
```

**Step 6: Run dev server and verify login → dashboard redirect works**

```bash
npm run dev
# Visit http://localhost:3000 — should redirect to /login
# Login with admin@company.com / admin123 — should redirect to /dashboard
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add app layout with dark teal navbar and language switcher"
```

---

## Task 6: File Upload to Azure Blob Storage

**Files:**
- Create: `src/lib/blob.ts`
- Create: `src/app/api/upload/route.ts`

**Step 1: Create blob helper — `src/lib/blob.ts`**

```typescript
import { BlobServiceClient } from '@azure/storage-blob'

function getBlobClient() {
  const account = process.env.AZURE_BLOB_ACCOUNT_NAME!
  const key = process.env.AZURE_BLOB_ACCOUNT_KEY!
  const connectionString = `DefaultEndpointsProtocol=https;AccountName=${account};AccountKey=${key};EndpointSuffix=core.windows.net`
  return BlobServiceClient.fromConnectionString(connectionString)
}

export async function uploadReceipt(
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const client = getBlobClient()
  const container = client.getContainerClient(process.env.AZURE_BLOB_CONTAINER_NAME!)
  await container.createIfNotExists({ access: 'blob' })

  const blobName = `${Date.now()}-${filename}`
  const blockBlob = container.getBlockBlobClient(blobName)
  await blockBlob.upload(file, file.length, { blobHTTPHeaders: { blobContentType: contentType } })
  return blockBlob.url
}
```

**Step 2: Create upload API route — `src/app/api/upload/route.ts`**

```typescript
import { auth } from '@/auth'
import { uploadReceipt } from '@/lib/blob'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadReceipt(buffer, file.name, file.type)
  return NextResponse.json({ url })
}
```

**Step 3: Commit**

```bash
git add src/lib/blob.ts src/app/api/upload/
git commit -m "feat: add Azure Blob Storage receipt upload API"
```

---

## Task 7: Expenses API Routes

**Files:**
- Create: `src/app/api/expenses/route.ts`
- Create: `src/app/api/expenses/[id]/route.ts`

**Step 1: Create expenses list + create route — `src/app/api/expenses/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('DKK'),
  paymentMethodId: z.string().optional(),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  receiptDate: z.string().optional(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING']).default('DRAFT'),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = session.user.role === 'OWNER'
    ? (searchParams.get('userId') ?? undefined)
    : session.user.id

  const expenses = await prisma.expense.findMany({
    where: { userId: userId ?? session.user.id },
    include: { category: true, tag: true, paymentMethod: true, user: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(expenses)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check accounting period lock
  const period = await prisma.accountingPeriod.findFirst()
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  if (period?.lockedBeforeDate && parsed.data.receiptDate) {
    const receiptDate = new Date(parsed.data.receiptDate)
    if (receiptDate < period.lockedBeforeDate) {
      return NextResponse.json({ error: 'Receipt date is in locked accounting period' }, { status: 400 })
    }
  }

  const expense = await prisma.expense.create({
    data: {
      ...parsed.data,
      receiptDate: parsed.data.receiptDate ? new Date(parsed.data.receiptDate) : undefined,
      userId: session.user.id,
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
```

**Step 2: Create single expense route — `src/app/api/expenses/[id]/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  paymentMethodId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tagId: z.string().optional().nullable(),
  receiptDate: z.string().optional().nullable(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expense = await prisma.expense.findUnique({ where: { id: params.id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only owner or the expense owner can update
  if (expense.userId !== session.user.id && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      receiptDate: parsed.data.receiptDate ? new Date(parsed.data.receiptDate) : undefined,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expense = await prisma.expense.findUnique({ where: { id: params.id } })
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (expense.userId !== session.user.id && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.expense.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

**Step 3: Commit**

```bash
git add src/app/api/expenses/
git commit -m "feat: add expenses CRUD API routes with accounting period lock"
```

---

## Task 8: My Expenses Page

**Files:**
- Create: `src/app/(app)/expenses/page.tsx`
- Create: `src/components/expenses/CreateExpenseModal.tsx`
- Create: `src/components/expenses/ExpenseStatusBadge.tsx`

**Step 1: Create status badge — `src/components/expenses/ExpenseStatusBadge.tsx`**

```typescript
import { Badge } from '@/components/ui/badge'

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export default function ExpenseStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`${statusStyles[status] ?? ''} border-0 text-xs font-medium`}>
      {status}
    </Badge>
  )
}
```

**Step 2: Create the expenses page — `src/app/(app)/expenses/page.tsx`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import ExpenseStatusBadge from '@/components/expenses/ExpenseStatusBadge'
import CreateExpenseModal from '@/components/expenses/CreateExpenseModal'
import { format } from 'date-fns'

export default async function ExpensesPage() {
  const session = await auth()
  const t = await getTranslations('expenses')

  const [expenses, categories, paymentMethods, tags] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: session!.user.id },
      include: { category: true, paymentMethod: true, tag: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
        </div>
        <CreateExpenseModal
          categories={categories}
          paymentMethods={paymentMethods}
          tags={tags}
        />
      </div>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          {t('noExpenses')}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">ID</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Payment</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 text-gray-600">
                    {e.receiptDate ? format(new Date(e.receiptDate), 'dd.MM.yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">#{e.sequentialId}</td>
                  <td className="px-4 py-3">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.paymentMethod?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <ExpenseStatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {e.amount.toFixed(2)} {e.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create expense modal — `src/components/expenses/CreateExpenseModal.tsx`**

```typescript
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X } from 'lucide-react'

interface Props {
  categories: { id: string; name: string }[]
  paymentMethods: { id: string; name: string }[]
  tags: { id: string; name: string }[]
}

export default function CreateExpenseModal({ categories, paymentMethods, tags }: Props) {
  const t = useTranslations('expenses')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    currency: 'DKK',
    paymentMethodId: '',
    categoryId: '',
    tagId: '',
    receiptDate: '',
    description: '',
  })

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  async function handleSubmit(status: 'DRAFT' | 'PENDING') {
    setLoading(true)
    let receiptUrl = ''

    if (file) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) receiptUrl = data.url
    }

    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        receiptUrl,
        status,
        paymentMethodId: form.paymentMethodId || undefined,
        categoryId: form.categoryId || undefined,
        tagId: form.tagId || undefined,
        receiptDate: form.receiptDate || undefined,
      }),
    })

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-[#00a8c8] hover:bg-[#0090aa]">
        {t('create')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Opret udgift</DialogTitle>
          </DialogHeader>

          {/* File upload */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragging ? 'border-[#00a8c8] bg-blue-50' : 'border-gray-200'}`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-700">{file.name}</span>
                <button onClick={() => setFile(null)}><X size={14} /></button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload size={32} className="mx-auto text-[#00a8c8] mb-2" />
                <p className="text-sm text-gray-500">
                  Træk dine filer her, eller{' '}
                  <span className="text-[#00a8c8]">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Accepterer: JPG, PNG og PDF</p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('amount')}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="flex-1"
                />
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DKK">DKK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('paymentMethod')}</Label>
              <Select value={form.paymentMethodId} onValueChange={(v) => setForm({ ...form, paymentMethodId: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('category')}</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('receiptDate')}</Label>
              <Input
                type="date"
                value={form.receiptDate}
                onChange={(e) => setForm({ ...form, receiptDate: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>{t('tag')}</Label>
              <Select value={form.tagId} onValueChange={(v) => setForm({ ...form, tagId: v })}>
                <SelectTrigger><SelectValue placeholder="Select tag..." /></SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>{t('description')}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t('cancel')}</Button>
            <Button variant="outline" onClick={() => handleSubmit('DRAFT')} disabled={loading}>
              {t('saveDraft')}
            </Button>
            <Button
              onClick={() => handleSubmit('PENDING')}
              disabled={!form.amount || loading}
              className="bg-[#00a8c8] hover:bg-[#0090aa]"
            >
              {t('submit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Step 4: Commit**

```bash
git add src/app/(app)/expenses/ src/components/expenses/
git commit -m "feat: add My Expenses page with create expense modal and file upload"
```

---

## Task 9: Approvals Page

**Files:**
- Create: `src/app/(app)/approvals/page.tsx`
- Create: `src/app/api/approvals/route.ts`

**Step 1: Create approvals API — `src/app/api/approvals/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const actionSchema = z.object({
  expenseId: z.string(),
  action: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // For owners: get all pending expenses
  // For others: get expenses where they are in the approval chain
  let expenses
  if (session.user.role === 'OWNER') {
    expenses = await prisma.expense.findMany({
      where: { status: 'PENDING' },
      include: { user: true, category: true, paymentMethod: true, tag: true },
      orderBy: { createdAt: 'desc' },
    })
  } else {
    const chain = await prisma.approvalChain.findMany({
      where: { approverId: session.user.id },
      select: { userId: true },
    })
    const userIds = chain.map((c) => c.userId)
    expenses = await prisma.expense.findMany({
      where: { status: 'PENDING', userId: { in: userIds } },
      include: { user: true, category: true, paymentMethod: true, tag: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  return NextResponse.json(expenses)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { expenseId, action, comment } = parsed.data

  await prisma.$transaction([
    prisma.approval.create({
      data: {
        expenseId,
        approverId: session.user.id,
        status: action,
        comment,
        actedAt: new Date(),
      },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: { status: action },
    }),
  ])

  return NextResponse.json({ ok: true })
}
```

**Step 2: Create approvals page — `src/app/(app)/approvals/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import ExpenseStatusBadge from '@/components/expenses/ExpenseStatusBadge'
import { format } from 'date-fns'

export default function ApprovalsPage() {
  const t = useTranslations('approvals')
  const [expenses, setExpenses] = useState<any[]>([])
  const [comment, setComment] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/approvals').then(r => r.json()).then(setExpenses)
  }, [])

  async function act(expenseId: string, action: 'APPROVED' | 'REJECTED') {
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId, action, comment: comment[expenseId] }),
    })
    setExpenses(prev => prev.filter(e => e.id !== expenseId))
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{t('title')}</h1>

      {expenses.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          {t('noExpenses')}
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((e) => (
            <div key={e.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium">{e.user?.name}</span>
                    <ExpenseStatusBadge status={e.status} />
                    <span className="text-xs text-gray-400">#{e.sequentialId}</span>
                  </div>
                  <p className="text-gray-700">{e.description}</p>
                  <div className="text-sm text-gray-500 mt-1 flex gap-4">
                    <span>{e.category?.name}</span>
                    <span>{e.receiptDate ? format(new Date(e.receiptDate), 'dd.MM.yyyy') : ''}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">{e.amount.toFixed(2)} {e.currency}</p>
                  <p className="text-sm text-gray-500">{e.paymentMethod?.name}</p>
                </div>
              </div>
              <div className="mt-3 flex items-end gap-2">
                <Textarea
                  placeholder={t('comment')}
                  className="text-sm h-16 resize-none flex-1"
                  value={comment[e.id] ?? ''}
                  onChange={(ev) => setComment(prev => ({ ...prev, [e.id]: ev.target.value }))}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => act(e.id, 'REJECTED')}
                  >
                    {t('reject')}
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => act(e.id, 'APPROVED')}
                  >
                    {t('approve')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(app)/approvals/ src/app/api/approvals/
git commit -m "feat: add approvals page with approve/reject actions"
```

---

## Task 10: Archive Page

**Files:**
- Create: `src/app/(app)/archive/page.tsx`
- Create: `src/app/api/archive/route.ts`

**Step 1: Archive API — `src/app/api/archive/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  const where: any = {
    status: { in: ['APPROVED', 'REJECTED'] },
  }

  if (session.user.role !== 'OWNER') {
    where.userId = session.user.id
  }

  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { user: true, category: true, paymentMethod: true, tag: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(expenses)
}
```

**Step 2: Archive page — `src/app/(app)/archive/page.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'use'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import ExpenseStatusBadge from '@/components/expenses/ExpenseStatusBadge'
import { format } from 'date-fns'

export default function ArchivePage() {
  const t = useTranslations('archive')
  const [expenses, setExpenses] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : ''
    fetch(`/api/archive${params}`).then(r => r.json()).then(setExpenses)
  }, [search])

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const refundable = expenses
    .filter(e => e.paymentMethod?.type === 'REIMBURSABLE')
    .reduce((s, e) => s + e.amount, 0)

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-3 border-b flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <Input
                placeholder="Search receipts..."
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-500 flex gap-4">
              <span>Refundable: <strong>{refundable.toFixed(2)}</strong></span>
              <span>Total: <strong>{total.toFixed(2)}</strong></span>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('date')}</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('id')}</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('user')}</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('description')}</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('category')}</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('paymentMethod')}</th>
                <th className="text-left px-3 py-2 text-gray-500 font-medium">{t('status')}</th>
                <th className="text-right px-3 py-2 text-gray-500 font-medium">{t('amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-3 py-2 text-gray-600">
                    {e.receiptDate ? format(new Date(e.receiptDate), 'dd.MM.yyyy') : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs">#{e.sequentialId}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#00a8c8] text-white text-xs font-medium">
                      {e.user?.initials?.slice(0, 2) || e.user?.name?.slice(0, 2).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2">{e.description ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{e.category?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{e.paymentMethod?.name ?? '—'}</td>
                  <td className="px-3 py-2"><ExpenseStatusBadge status={e.status} /></td>
                  <td className="px-3 py-2 text-right font-medium">{e.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      <div className="w-64 bg-white rounded-lg border p-4 text-sm text-gray-500 h-fit">
        {selected ? (
          <div className="space-y-2">
            <p className="font-medium text-gray-900">{selected.description}</p>
            <p>{selected.user?.name}</p>
            <p>{selected.amount.toFixed(2)} {selected.currency}</p>
            <p>{selected.category?.name}</p>
            <p>{selected.paymentMethod?.name}</p>
            {selected.receiptUrl && (
              <a href={selected.receiptUrl} target="_blank" className="text-[#00a8c8] underline">
                View receipt
              </a>
            )}
          </div>
        ) : (
          <p>Click an expense to see details</p>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/(app)/archive/ src/app/api/archive/
git commit -m "feat: add archive page with search and detail panel"
```

---

## Task 11: Dashboard

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/api/dashboard/route.ts`
- Create: `src/components/dashboard/ExpenseLineChart.tsx`
- Create: `src/components/dashboard/CategoryPieChart.tsx`
- Create: `src/components/dashboard/UserBarChart.tsx`

**Step 1: Dashboard API — `src/app/api/dashboard/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isOwner = session.user.role === 'OWNER'

  const [expenses, pending, recentApprovals] = await Promise.all([
    prisma.expense.findMany({
      where: isOwner ? {} : { userId: session.user.id },
      include: { category: true, user: true, paymentMethod: true },
      orderBy: { receiptDate: 'asc' },
    }),
    prisma.expense.count({ where: { status: 'PENDING' } }),
    prisma.approval.findMany({
      take: 10,
      orderBy: { actedAt: 'desc' },
      include: { expense: true, approver: true },
    }),
  ])

  return NextResponse.json({ expenses, pending, recentApprovals })
}
```

**Step 2: Line chart component — `src/components/dashboard/ExpenseLineChart.tsx`**

```typescript
'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ExpenseLineChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="total" stroke="#00a8c8" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

**Step 3: Pie chart component — `src/components/dashboard/CategoryPieChart.tsx`**

```typescript
'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#00a8c8', '#1a3a4a', '#4fc3f7', '#81d4fa', '#b3e5fc', '#e1f5fe', '#006064', '#00838f']

export default function CategoryPieChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="40%" outerRadius={90}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => v.toFixed(2)} />
        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

**Step 4: Bar chart component — `src/components/dashboard/UserBarChart.tsx`**

```typescript
'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function UserBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="total" fill="#00a8c8" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

**Step 5: Dashboard page — `src/app/(app)/dashboard/page.tsx`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { format } from 'date-fns'
import ExpenseLineChart from '@/components/dashboard/ExpenseLineChart'
import CategoryPieChart from '@/components/dashboard/CategoryPieChart'
import UserBarChart from '@/components/dashboard/UserBarChart'

export default async function DashboardPage() {
  const session = await auth()
  const t = await getTranslations('nav')
  const isOwner = session!.user.role === 'OWNER'

  const expenses = await prisma.expense.findMany({
    where: isOwner ? {} : { userId: session!.user.id },
    include: { category: true, user: true },
    orderBy: { receiptDate: 'asc' },
  })

  const pending = await prisma.expense.count({ where: { status: 'PENDING' } })

  // Line chart: expenses by day
  const byDay: Record<string, number> = {}
  for (const e of expenses) {
    if (!e.receiptDate) continue
    const key = format(new Date(e.receiptDate), 'dd.MM')
    byDay[key] = (byDay[key] ?? 0) + e.amount
  }
  const lineData = Object.entries(byDay).map(([date, total]) => ({ date, total }))

  // Pie chart: by category
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    const name = e.category?.name ?? 'Other'
    byCategory[name] = (byCategory[name] ?? 0) + e.amount
  }
  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Bar chart: by user
  const byUser: Record<string, { name: string; total: number }> = {}
  for (const e of expenses) {
    const id = e.userId
    if (!byUser[id]) byUser[id] = { name: e.user.name, total: 0 }
    byUser[id].total += e.amount
  }
  const barData = Object.values(byUser).sort((a, b) => b.total - a.total)

  const recentActivity = await prisma.approval.findMany({
    take: 6,
    orderBy: { actedAt: 'desc' },
    include: { expense: { include: { user: true } }, approver: true },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard')}</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Charts */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Expenses over time</h2>
            <ExpenseLineChart data={lineData} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <h2 className="text-sm font-medium text-gray-700 mb-3">By Category</h2>
              <CategoryPieChart data={pieData} />
            </div>
            <div className="bg-white rounded-lg border p-4">
              <h2 className="text-sm font-medium text-gray-700 mb-3">By Employee</h2>
              <UserBarChart data={barData} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Requires approval</h2>
            {pending === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No pending expenses</p>
            ) : (
              <p className="text-2xl font-bold text-[#00a8c8]">{pending}</p>
            )}
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Recent activity</h2>
            <div className="space-y-2">
              {recentActivity.map((a) => (
                <div key={a.id} className="text-xs text-gray-600 flex justify-between">
                  <span>{a.expense.user?.name}</span>
                  <span className={a.status === 'APPROVED' ? 'text-green-600' : 'text-red-500'}>
                    {a.status === 'APPROVED' ? '✓' : '✗'} #{a.expense.sequentialId}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/app/(app)/dashboard/ src/app/api/dashboard/ src/components/dashboard/
git commit -m "feat: add dashboard with line, pie, and bar charts and activity feed"
```

---

## Task 12: Settings — Users

**Files:**
- Create: `src/app/(app)/settings/users/page.tsx`
- Create: `src/app/api/settings/users/route.ts`
- Create: `src/app/api/settings/users/[id]/route.ts`

**Step 1: Users API — `src/app/api/settings/users/route.ts`**

```typescript
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

function ownerOnly(session: any) {
  return session?.user?.role !== 'OWNER'
}

export async function GET() {
  const session = await auth()
  if (!session || ownerOnly(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || ownerOnly(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const hash = await bcrypt.hash(parsed.data.password, 12)
  const user = await prisma.user.create({
    data: {
      ...parsed.data,
      passwordHash: hash,
      initials: parsed.data.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      status: 'ACTIVE',
    },
  })

  return NextResponse.json(user, { status: 201 })
}
```

**Step 2: User update API — `src/app/api/settings/users/[id]/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  role: z.enum(['OWNER', 'USER']).optional(),
  status: z.enum(['ACTIVE', 'DEACTIVATED']).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json(user)
}
```

**Step 3: Users settings page — `src/app/(app)/settings/users/page.tsx`**

```typescript
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AddUserModal from '@/components/settings/AddUserModal'

export default async function UsersPage() {
  const session = await auth()
  if (session?.user.role !== 'OWNER') redirect('/dashboard')
  const t = await getTranslations('settings')

  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
  const active = users.filter(u => u.status === 'ACTIVE')
  const pending = users.filter(u => u.status === 'PENDING')
  const deactivated = users.filter(u => u.status === 'DEACTIVATED')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <AddUserModal />
      </div>

      {[
        { label: 'Active users', items: active },
        { label: 'Pending users', items: pending },
        { label: 'Deactivated users', items: deactivated },
      ].map(({ label, items }) => items.length > 0 && (
        <div key={label} className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2">{label}</h2>
          <div className="bg-white rounded-lg border divide-y">
            {items.map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#00a8c8] text-white text-xs font-medium">
                    {u.initials || u.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{u.role}</Badge>
                  <Badge
                    className={`text-xs ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} border-0`}
                  >
                    {u.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 4: Create `src/components/settings/AddUserModal.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AddUserModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/settings/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-[#00a8c8] hover:bg-[#0090aa]">
        Add User
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Name</Label><Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><Label>Password</Label><Input type="password" required minLength={8} value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#00a8c8] hover:bg-[#0090aa]">Add User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Step 5: Commit**

```bash
git add src/app/(app)/settings/ src/app/api/settings/ src/components/settings/
git commit -m "feat: add settings users page with add/view users"
```

---

## Task 13: Settings — Categories, Tags, Payment Methods

**Files:**
- Create: `src/app/(app)/settings/categories/page.tsx`
- Create: `src/app/(app)/settings/tags/page.tsx`
- Create: `src/app/(app)/settings/payment-methods/page.tsx`
- Create: `src/app/api/settings/categories/route.ts`
- Create: `src/app/api/settings/tags/route.ts`
- Create: `src/app/api/settings/payment-methods/route.ts`

**Step 1: Categories API — `src/app/api/settings/categories/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  financeAccount: z.string().optional(),
  vatCode: z.string().optional(),
  active: z.boolean().default(true),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const category = await prisma.category.create({ data: parsed.data })
  return NextResponse.json(category, { status: 201 })
}
```

**Step 2: Tags API — `src/app/api/settings/tags/route.ts`**

```typescript
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
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const tag = await prisma.tag.create({ data: parsed.data })
  return NextResponse.json(tag, { status: 201 })
}
```

**Step 3: Payment methods API — `src/app/api/settings/payment-methods/route.ts`**

```typescript
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
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const pm = await prisma.paymentMethod.create({ data: parsed.data })
  return NextResponse.json(pm, { status: 201 })
}
```

**Step 4: Categories page — `src/app/(app)/settings/categories/page.tsx`**

```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import CategoriesClient from '@/components/settings/CategoriesClient'

export default async function CategoriesPage() {
  const session = await auth()
  if (session?.user.role !== 'OWNER') redirect('/dashboard')
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  return <CategoriesClient initialCategories={categories} />
}
```

**Step 5: Create `src/components/settings/CategoriesClient.tsx`**

Build a client component that:
- Shows two sections: Active categories and Inactive categories
- Each category shows name, finance account, VAT code, and a toggle button (active/inactive)
- Has an "Add Category" button that opens a small inline form (name, financeAccount, vatCode)
- Calls POST `/api/settings/categories` to create, PATCH `/api/settings/categories/[id]` to toggle active

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function CategoriesClient({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', financeAccount: '', vatCode: '' })

  async function addCategory() {
    const res = await fetch('/api/settings/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, active: true }),
    })
    const cat = await res.json()
    setCategories(prev => [...prev, cat])
    setAdding(false)
    setForm({ name: '', financeAccount: '', vatCode: '' })
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/settings/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    setCategories(prev => prev.map(c => c.id === id ? { ...c, active: !active } : c))
  }

  const active = categories.filter(c => c.active)
  const inactive = categories.filter(c => !c.active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Button onClick={() => setAdding(true)} className="bg-[#00a8c8] hover:bg-[#0090aa]">
          Add Category
        </Button>
      </div>

      {adding && (
        <div className="bg-white border rounded-lg p-4 mb-4 flex gap-3 items-end">
          <div><label className="text-xs text-gray-500">Name</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-8" /></div>
          <div><label className="text-xs text-gray-500">Finance account</label><Input value={form.financeAccount} onChange={e => setForm({...form, financeAccount: e.target.value})} className="h-8" /></div>
          <div><label className="text-xs text-gray-500">VAT code</label><Input value={form.vatCode} onChange={e => setForm({...form, vatCode: e.target.value})} className="h-8" /></div>
          <Button onClick={addCategory} className="bg-[#00a8c8] hover:bg-[#0090aa] h-8">Save</Button>
          <Button variant="outline" onClick={() => setAdding(false)} className="h-8">Cancel</Button>
        </div>
      )}

      {[{ label: 'Active categories', items: active }, { label: 'Inactive categories', items: inactive }].map(({ label, items }) => (
        <div key={label} className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-2">{label}</h2>
          <div className="grid grid-cols-2 gap-3">
            {items.map(cat => (
              <div key={cat.id} className="bg-white border rounded-lg p-3 flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{cat.name}</p>
                  {cat.financeAccount && <p className="text-xs text-gray-400">Account: {cat.financeAccount}</p>}
                  {cat.vatCode && <p className="text-xs text-gray-400">VAT: {cat.vatCode}</p>}
                </div>
                <button
                  onClick={() => toggleActive(cat.id, cat.active)}
                  className={`w-4 h-4 rounded-full border-2 mt-1 ${cat.active ? 'bg-green-500 border-green-500' : 'bg-gray-200 border-gray-300'}`}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 6: Add PATCH route for categories — `src/app/api/settings/categories/[id]/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const updated = await prisma.category.update({ where: { id: params.id }, data: body })
  return NextResponse.json(updated)
}
```

**Step 7: Build similar simple pages for Tags and Payment Methods** following the same pattern as Categories (list + add modal + toggle/delete).

**Step 8: Commit**

```bash
git add src/app/(app)/settings/ src/app/api/settings/ src/components/settings/
git commit -m "feat: add settings for categories, tags, and payment methods"
```

---

## Task 14: Settings — Approval Settings & Accounting Period

**Files:**
- Create: `src/app/(app)/settings/approvals/page.tsx`
- Create: `src/app/(app)/settings/accounting-period/page.tsx`
- Create: `src/app/api/settings/approvals/route.ts`
- Create: `src/app/api/settings/accounting-period/route.ts`

**Step 1: Approval chains API — `src/app/api/settings/approvals/route.ts`**

```typescript
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
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const chains = await prisma.approvalChain.findMany({
    include: { user: true, approver: true },
  })
  return NextResponse.json(chains)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const chain = await prisma.approvalChain.create({ data: parsed.data })
  return NextResponse.json(chain, { status: 201 })
}
```

**Step 2: Accounting period API — `src/app/api/settings/accounting-period/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const period = await prisma.accountingPeriod.findFirst()
  return NextResponse.json(period)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
```

**Step 3: Build the approval settings page** listing all users with their assigned approver (dropdown to change), and the accounting period page with a single date picker.

**Step 4: Commit**

```bash
git add src/app/(app)/settings/approvals/ src/app/(app)/settings/accounting-period/ src/app/api/settings/approvals/ src/app/api/settings/accounting-period/
git commit -m "feat: add approval settings and accounting period lock"
```

---

## Task 15: My Profile Page

**Files:**
- Create: `src/app/(app)/profile/page.tsx`
- Create: `src/app/api/profile/route.ts`

**Step 1: Profile API — `src/app/api/profile/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.object({
  name: z.string().min(1).optional(),
  initials: z.string().optional(),
  language: z.string().optional(),
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

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { newPassword, ...data } = parsed.data
  const updateData: any = { ...data }

  if (newPassword) {
    updateData.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  // Update locale cookie if language changed
  const headers = new Headers()
  if (data.language) {
    headers.append('Set-Cookie', `locale=${data.language}; path=/; max-age=31536000`)
  }

  return NextResponse.json(user, { headers })
}
```

**Step 2: Profile page — `src/app/(app)/profile/page.tsx`**

Build a form page with sections for: personal info (name, initials), language selector (EN/DA), change password (old/new/confirm), company defaults (default payment method, default category). On save, calls PATCH `/api/profile`.

**Step 3: Commit**

```bash
git add src/app/(app)/profile/ src/app/api/profile/
git commit -m "feat: add profile page with personal info, language, and password change"
```

---

## Task 16: Expense Reports Page

**Files:**
- Create: `src/app/(app)/reports/page.tsx`
- Create: `src/app/api/reports/route.ts`

**Step 1: Reports API — `src/app/api/reports/route.ts`**

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  expenseIds: z.array(z.string()),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reports = await prisma.expenseReport.findMany({
    include: {
      createdBy: true,
      expenses: { include: { expense: { include: { user: true, paymentMethod: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(reports)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { dateFrom, dateTo, expenseIds } = parsed.data

  const report = await prisma.expenseReport.create({
    data: {
      createdById: session.user.id,
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
      expenses: {
        create: expenseIds.map(id => ({ expenseId: id })),
      },
    },
    include: { expenses: true },
  })

  return NextResponse.json(report, { status: 201 })
}
```

**Step 2: Reports page** — shows report cards (date range, employee count, totals, status badge) in active and archived sections, with an Export button per report that downloads a CSV.

**Step 3: Commit**

```bash
git add src/app/(app)/reports/ src/app/api/reports/
git commit -m "feat: add expense reports page"
```

---

## Task 17: Docker & CI/CD

**Files:**
- Create: `Dockerfile`
- Create: `.gitlab-ci.yml`
- Create: `.dockerignore`

**Step 1: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

**Step 2: Update `next.config.ts` for standalone output**

Add to the config object:
```typescript
output: 'standalone',
```

**Step 3: Create `.dockerignore`**

```
node_modules
.next
.git
*.env*
.env.local
```

**Step 4: Create `.gitlab-ci.yml`**

```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  DOCKER_IMAGE_LATEST: $CI_REGISTRY_IMAGE:latest

test:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm test
  only:
    - merge_requests
    - main

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $DOCKER_IMAGE -t $DOCKER_IMAGE_LATEST .
    - docker push $DOCKER_IMAGE
    - docker push $DOCKER_IMAGE_LATEST
  only:
    - main

deploy:
  stage: deploy
  image: mcr.microsoft.com/azure-cli
  script:
    - az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID
    - az webapp config container set
        --name $AZURE_APP_NAME
        --resource-group $AZURE_RESOURCE_GROUP
        --docker-custom-image-name $DOCKER_IMAGE
        --docker-registry-server-url $CI_REGISTRY
        --docker-registry-server-user $CI_REGISTRY_USER
        --docker-registry-server-password $CI_REGISTRY_PASSWORD
    - az webapp restart --name $AZURE_APP_NAME --resource-group $AZURE_RESOURCE_GROUP
  only:
    - main
  environment:
    name: production
```

**Step 5: Set required GitLab CI/CD variables in your GitLab project settings:**
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`
- `AZURE_APP_NAME`, `AZURE_RESOURCE_GROUP`
- `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `AZURE_BLOB_ACCOUNT_NAME`, `AZURE_BLOB_ACCOUNT_KEY`, `AZURE_BLOB_CONTAINER_NAME`

**Step 6: Commit**

```bash
git add Dockerfile .gitlab-ci.yml .dockerignore
git commit -m "feat: add Docker build and GitLab CI/CD pipeline for Azure deployment"
```

---

## Task 18: Seed Default Categories

**Step 1: Add common Danish expense categories to the seed**

Add to `prisma/seed.ts` before the `main()` call:

```typescript
const defaultCategories = [
  { name: 'Meals', financeAccount: '2241', vatCode: '25%' },
  { name: 'Restaurant / client meals', financeAccount: '2751', vatCode: '25%' },
  { name: 'Transport', financeAccount: '2770', vatCode: '25%' },
  { name: 'IT software / subscriptions', financeAccount: '3604', vatCode: '25%' },
  { name: 'Internet', financeAccount: '3621', vatCode: '25%' },
  { name: 'Office supplies', financeAccount: '2800', vatCode: '25%' },
  { name: 'Accommodation', financeAccount: '2760', vatCode: '25%' },
  { name: 'Other', financeAccount: '9999', vatCode: '25%' },
]

await prisma.category.createMany({ data: defaultCategories, skipDuplicates: true })
```

**Step 2: Re-run seed**

```bash
npx prisma db seed
```

**Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed default expense categories"
```

---

## Final Verification

```bash
# Run all tests
npm test

# Start dev server and verify all pages load
npm run dev

# Build for production
npm run build

# Check no TypeScript errors
npx tsc --noEmit
```

Verify these pages work end-to-end:
1. `/login` → login with `admin@company.com` / `admin123`
2. `/dashboard` → charts render
3. `/expenses` → create expense, upload receipt, submit
4. `/approvals` → approve/reject expenses
5. `/archive` → search and view approved expenses
6. `/settings/users` → add a new user
7. `/settings/categories` → add/toggle categories
8. Language switcher toggles EN ↔ DA

```bash
git add .
git commit -m "feat: complete receipt app implementation"
```
