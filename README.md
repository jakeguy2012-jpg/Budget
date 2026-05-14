# Family Finance Hub

A self-hosted household finance and budgeting web app for a two-person household. It helps you view accounts, import or sync read-only transactions, categorize spending, review budgets, and export your own data without a required cloud subscription.

## What it does

- Runs locally with Docker Compose: Next.js, PostgreSQL, Prisma, and an optional sync worker.
- Supports two seeded users: `jake` as `admin` and `wife` as `viewer_editor`.
- Tracks household accounts, balances, transactions, categories, budgets, category rules, sync history, and audit logs.
- Syncs SimpleFIN read-only account/transaction data when you add an encrypted SimpleFIN access URL.
- Imports bank CSV data with simple column mapping and duplicate prevention.
- Includes a Plaid read-only adapter placeholder for possible future use.
- Provides dashboard, transaction review, budgets, categories, rules, accounts, connections, imports, and settings pages.

## What it does not do

Family Finance Hub never initiates payments, transfers, ACH, bill pay, card actions, investment trades, account/routing number collection, or write-back actions to financial institutions.

## Quick start with Docker

```bash
git clone <your-repo-url> family-finance-hub
cd family-finance-hub
cp .env.example .env
openssl rand -base64 32
# paste that value into APP_ENCRYPTION_KEY in .env and change passwords/secrets
docker compose up --build
```

Open <http://localhost:3000>. The default app port is `3000`; change `PORT` in `.env` if needed.

Demo logins use the passwords from `.env`:

- Username: `jake`, password: `SEED_ADMIN_PASSWORD`
- Username: `wife`, password: `SEED_WIFE_PASSWORD`

## Local development without Docker

```bash
npm install
cp .env.example .env
# set DATABASE_URL to your PostgreSQL database
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL connection strings. |
| `APP_URL` | Local app URL. |
| `PORT` | Web port, default `3000`. |
| `SESSION_SECRET` | Long random value for signed sessions. |
| `APP_ENCRYPTION_KEY` | 32-byte base64 key for provider secrets. Generate with `openssl rand -base64 32`. |
| `SEED_ADMIN_PASSWORD` / `SEED_WIFE_PASSWORD` | Demo user passwords used during seed. |
| `ENABLE_DAILY_SYNC` | Set `true` to enable worker scheduled sync. |
| `DAILY_SYNC_CRON` | Cron expression for the sync worker. |

## Add SimpleFIN

1. Sign in as `jake`.
2. Go to **Connections**.
3. Paste your SimpleFIN setup/access URL.
4. Save the read-only connection.
5. Click **Manual sync**.

The URL is encrypted at rest with `APP_ENCRYPTION_KEY`. Do not share it, commit it, or paste it into logs/issues.

## Import CSV

1. Go to **CSV imports**.
2. Paste CSV data from your bank or card issuer.
3. Fill the column names for date, description, amount, merchant, account, and type as available.
4. Submit. Rows are de-duplicated with an account/date/amount/description fingerprint.

## Reset demo data

```bash
docker compose exec -e RESET_DEMO_DATA=true web npx prisma db seed
```

This clears app data and recreates the household, users, accounts, 100 sample transactions, default rules, categories, and budgets.

## Backups and restore

Back up the Docker volume or use `pg_dump`:

```bash
docker compose exec db pg_dump -U family_finance family_finance_hub > backup.sql
```

Restore to a fresh database with `psql`. Also back up `.env` separately because encrypted provider secrets require the same `APP_ENCRYPTION_KEY` to decrypt.

## Testing

```bash
npm test
```

## Security notes

See [SECURITY.md](SECURITY.md). In short: keep this local/private, use strong secrets, avoid exposing it to the public internet, and prefer VPN/Tailscale/Cloudflare Tunnel with additional access controls if remote access is needed.
