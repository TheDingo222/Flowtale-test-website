# Receipt App — Design Document
**Date:** 2026-03-18
**Status:** Approved

## Overview

A self-hosted expense and receipt management web app for internal company use (15 users), modelled after Outlay. Employees upload receipts and submit expenses; a super admin approves them. The app runs on Azure, is deployed via GitLab CI/CD, and supports English and Danish.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Azure Database for PostgreSQL Flexible Server) |
| ORM | Prisma |
| Auth | NextAuth.js v5 (email + password) |
| File storage | Azure Blob Storage (JPG, PNG, PDF receipts) |
| UI | Tailwind CSS + shadcn/ui |
| i18n | next-intl (English / Danish) |
| Charts | Recharts |
| CI/CD | GitLab → Docker → Azure App Service |

---

## Pages & Features

### Login
- Email + password authentication
- Language switcher (EN/DA)

### Dashboard
- Line chart: expenses over time (filterable by date range and category)
- Pie chart: totals by category
- Bar chart: amounts by user
- "Requires approval" panel (pending expenses)
- Recent activity feed

### My Expenses (`/expenses`)
- List of own expenses with status badges (Draft / Pending / Approved / Rejected)
- Filter by date, category, status
- **Create Expense modal:**
  - File upload (drag & drop or browse — JPG, PNG, PDF)
  - Amount + currency (DKK default)
  - Payment method (dropdown)
  - Category (dropdown)
  - Tag (dropdown)
  - Receipt date (date picker)
  - Description (text area)
  - Actions: Cancel / Save Draft / Submit

### Approvals (`/approvals`)
- List of expenses pending this user's approval
- "My Approvals" tab
- Per expense: approve or reject with optional comment
- Once actioned, removed from pending list

### Expense Reports (`/reports`)
- Active reports: report cards showing date range, employees, totals, status
- Archived reports: completed/exported reports
- Export button (CSV/PDF)

### Archive (`/archive`)
- Full searchable table of all approved/processed expenses
- Columns: Date, ID, User (initials), Description, Category/Project, Tags, Payment Method, Status, Amount
- Click row to see expense details + receipt image
- Filter by user, category, date range, payment method

### Settings

#### Users (`/settings/users`)
- List of active, pending, and deactivated users
- Invite user by email (sends invitation link)
- Assign role: Owner or User
- Deactivate / reactivate users

#### Categories (`/settings/categories`)
- Active and inactive category lists
- Add/edit category: name, finance account code, VAT code
- Toggle active/inactive

#### Tags (`/settings/tags`)
- Create and manage tags (grouped by period/project)
- Each tag shows count of attached expenses

#### Payment Methods (`/settings/payment-methods`)
- Add payment method: name, finance account, type (Standard / Reimbursable)
- Default method indicator

#### Approval Settings (`/settings/approvals`)
- Approval chains: assign one or more approvers per user
- Standard chain applies to all unless overridden

#### Accounting Period Limit (`/settings/accounting-period`)
- Set a locked-before date — no expenses can be added, edited, or approved before this date

### My Profile (`/profile`)
- Edit name, initials, country
- Notification preferences (email toggles)
- Update email address
- Company info (company name, CVR, phone, address)
- Default payment method and category
- Bank account number
- Change password

---

## Data Model

```
users               id, name, email, password_hash, role, status,
                    default_payment_method_id, default_category_id,
                    language, created_at

expenses            id, user_id, amount, currency, payment_method_id,
                    category_id, tag_id, receipt_date, description,
                    receipt_url, status (draft/pending/approved/rejected),
                    created_at, updated_at

approval_chains     id, user_id, approver_id, order

approvals           id, expense_id, approver_id, status, comment, acted_at

expense_reports     id, created_by, date_from, date_to, status, exported_at

categories          id, name, finance_account, vat_code, active

tags                id, name, period

payment_methods     id, name, finance_account, type (standard/reimbursable),
                    is_default

accounting_period   id, locked_before_date
```

---

## Auth & Roles

- **Owner (super admin):** full access — can manage users, settings, approve all expenses, view all data
- **User:** can create/submit own expenses, view own archive, see own profile

---

## UI Design

- Dark teal/navy top navigation bar
- White content cards on light gray background
- Teal accent color for primary buttons and highlights
- Language switcher in top navigation
- Responsive layout (desktop-first, usable on tablet)

---

## Deployment

- Dockerized Next.js app
- GitLab CI/CD pipeline: build → test → push image → deploy to Azure App Service
- Azure Database for PostgreSQL (managed)
- Azure Blob Storage for receipt files
- Environment variables for all secrets (DATABASE_URL, NEXTAUTH_SECRET, AZURE_BLOB_*)
