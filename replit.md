# Family Finance Hub

A household finance dashboard for reviewing bank transactions, managing budgets, setting category rules, and syncing with SimpleFIN or importing CSVs.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/family-finance-hub run dev` — run the frontend (port 18279, proxied to `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `cd lib/db && npx tsx src/seed.ts` — seed demo users and default categories

Required env:
- `DATABASE_URL` — Postgres connection string (runtime-managed)
- `SESSION_SECRET` — JWT signing secret (set as Replit Secret)
- `APP_ENCRYPTION_KEY` — AES-256-GCM key for encrypting SimpleFIN credentials (base64, 32 bytes; set as Replit Secret)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, JWT auth via HttpOnly cookie (`ffh_session`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite, wouter routing, TanStack Query, Tailwind v4, Recharts
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle DB schema (households, users, connections, accounts, transactions, categories, rules, budgets, audit)
- `lib/api-spec/openapi.yaml` — full OpenAPI spec (source of truth)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, dashboard, transactions, categories, budgets, accounts, connections, rules, imports, export)
- `artifacts/api-server/src/lib/` — auth (JWT), crypto (AES), rules engine, SimpleFIN sync
- `artifacts/family-finance-hub/src/pages/` — React pages (Login, Dashboard, Transactions, Categories, Budgets, Accounts, Connections, Rules, Imports, Settings)
- `artifacts/family-finance-hub/src/components/` — AppShell (sidebar nav), RequireAuth

## Architecture decisions

- **Cookie-based JWT auth**: `ffh_session` HttpOnly cookie; no localStorage tokens. `SESSION_SECRET` required at runtime.
- **SimpleFIN credentials encrypted at rest**: AES-256-GCM with `APP_ENCRYPTION_KEY`; decrypted only at sync time, never logged.
- **All transactions go through accounts → connections**: no direct household-to-transaction link. Dashboard and transaction queries join through the connection chain.
- **Rules engine**: category rules match on merchantContains / descriptionContains and are applied at sync time or via `/api/rules/apply`.
- **CSV imports**: fingerprint-based dedup (sha256 of account+date+amount+description) to prevent duplicates on re-import.

## Product

- Login as `jake` (admin) or `wife` (viewer/editor) — password: `demo1234`
- Dashboard: monthly spending/income summary, pie chart by category, bar chart by account, budget progress bars
- Transactions: filter/search, inline category assignment
- Budgets: set monthly planned amounts per category
- Categories: create custom categories with colors
- Rules: keyword-matching auto-categorization rules; "Re-run rules" button
- Connections: add SimpleFIN read-only bank connection, trigger manual sync
- Imports: paste CSV, map columns, idempotent import
- Settings: export transactions/budgets as CSV or household as JSON

## User preferences

- Demo credentials: jake / demo1234 and wife / demo1234

## Gotchas

- SimpleFIN sync requires `APP_ENCRYPTION_KEY` to decrypt stored credentials
- `SESSION_SECRET` must be set or all auth endpoints throw 500
- DB enum for user roles is `"admin"` and `"viewer_editor"` (not "member")
- Both workflows must be running: API server (8080) and frontend (18279)
- Kill stale processes on port 18279 before restarting: `fuser -k 18279/tcp`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
