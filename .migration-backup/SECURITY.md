# Security

This app stores sensitive household financial data. Treat the server, database, backups, and `.env` file as private.

## Safe local deployment

- Run on a trusted home server or private LAN.
- Do not expose the app directly to the public internet.
- If remote access is required, prefer Tailscale, WireGuard, Cloudflare Tunnel with access controls, or another VPN/private tunnel.
- Use strong unique values for `SESSION_SECRET`, `APP_ENCRYPTION_KEY`, and seeded passwords.
- Keep Docker images and host OS patched.
- Back up PostgreSQL and `.env` securely. Losing `APP_ENCRYPTION_KEY` means encrypted provider credentials cannot be recovered.

## Read-only design

Family Finance Hub is designed for read-only financial access. It does not contain flows for payment initiation, ACH transfer, bill pay, card actions, investment trading, account/routing collection, or account changes.

## Secrets handling

- Provider credentials are encrypted at rest with AES-256-GCM.
- SimpleFIN access URLs are never intentionally logged.
- `.gitignore` excludes `.env`, dumps, logs, and secret folders.
- Store only masked account numbers when a provider supplies masks.

## Login protections

- Passwords are hashed with bcrypt.
- Login attempts are rate-limited in-process for basic local protection.
- Sessions use signed HTTP-only cookies.

## Reporting issues

Because this is a self-hosted personal app scaffold, rotate any exposed provider credentials immediately and reset `SESSION_SECRET` / `APP_ENCRYPTION_KEY` if a server or backup is compromised.
