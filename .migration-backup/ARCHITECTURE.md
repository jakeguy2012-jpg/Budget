# Architecture

Family Finance Hub is intentionally small and local-first.

## Runtime

- **Web:** Next.js with TypeScript, server components, API routes, Tailwind CSS, and Recharts.
- **Database:** PostgreSQL managed through Prisma.
- **Worker:** Node cron process for optional read-only SimpleFIN sync.
- **Deployment:** Docker Compose runs `web`, `db`, and `worker` services.

## Data flow

1. A household user signs in with local username/password auth.
2. Admin adds a read-only provider connection.
3. Provider credentials are encrypted with `APP_ENCRYPTION_KEY` before storage.
4. Manual or scheduled sync lists accounts, reads balances, and imports transactions.
5. Sync logic upserts accounts and transactions by provider IDs.
6. Categorization rules run in priority order and set category/exclusion flags.
7. Dashboard and review pages read household-scoped data only.

## Provider abstraction

Providers implement:

- `listAccounts()`
- `syncTransactions(startDate, endDate)`
- `getBalances()`
- `testConnection()`

Implemented providers:

- SimpleFIN: real read-only account, balance, and transaction provider.
- CSV: import provider using mapped columns and duplicate fingerprints.
- Plaid: placeholder only. Future work should use Link plus Transactions/Balance sync only, never Auth/payment/transfer products.

## Security boundaries

The codebase has no payment initiation, ACH transfer, bill pay, card action, account change, investment trading, or bank write-back capability. Audit logs are recorded for login, connection, sync, category, and budget events.
