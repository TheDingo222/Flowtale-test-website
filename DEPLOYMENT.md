# Deployment Guide

## Azure Setup

1. **Create Azure resources:**
   - Azure App Service (Linux, Docker container)
   - Azure Database for PostgreSQL Flexible Server
   - Azure Blob Storage account + container named `receipts`

2. **Set GitLab CI/CD variables** (Settings → CI/CD → Variables):
   - `AZURE_CLIENT_ID` — Service principal app ID
   - `AZURE_CLIENT_SECRET` — Service principal password
   - `AZURE_TENANT_ID` — Azure tenant ID
   - `AZURE_APP_NAME` — App Service name
   - `AZURE_RESOURCE_GROUP` — Resource group name
   - `DATABASE_URL` — PostgreSQL connection string
   - `NEXTAUTH_SECRET` — Random secret (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — Your app's public URL (e.g. `https://receipts.yourcompany.com`)
   - `AZURE_BLOB_ACCOUNT_NAME` — Storage account name
   - `AZURE_BLOB_ACCOUNT_KEY` — Storage account key
   - `AZURE_BLOB_CONTAINER_NAME` — `receipts`

3. **Set App Service environment variables** (same as CI/CD variables above):
   - `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
   - `AZURE_BLOB_ACCOUNT_NAME`, `AZURE_BLOB_ACCOUNT_KEY`, `AZURE_BLOB_CONTAINER_NAME`

4. **Run database migrations** (first time):
   ```bash
   # From local machine with DATABASE_URL set:
   npx prisma migrate deploy
   npx prisma db seed
   ```

## First Login
- URL: Your `NEXTAUTH_URL`
- Email: `admin@company.com`
- Password: `admin123`

**Change the admin password immediately after first login.**

## Local Development
```bash
# Install dependencies
npm install

# Set up .env.local (copy from .env.local.example or create manually)
# Start PostgreSQL locally (e.g. via Docker):
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=receiptapp postgres:16

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start dev server
npm run dev
```
