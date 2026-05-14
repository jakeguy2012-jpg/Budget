import app from "./app";
import { logger } from "./lib/logger";

// ── Startup secret validation ──────────────────────────────────────────────
const required: Array<{ key: string; hint: string }> = [
  { key: "SESSION_SECRET",     hint: "JWT signing key — set in Replit Secrets" },
  { key: "APP_ENCRYPTION_KEY", hint: "AES-256-GCM key for SimpleFIN credentials — set in Replit Secrets" },
  { key: "DATABASE_URL",       hint: "Postgres connection string — managed by Replit" },
];

let startupOk = true;
for (const { key, hint } of required) {
  if (!process.env[key]) {
    logger.error({ key, hint }, `Required secret missing: ${key}`);
    startupOk = false;
  }
}

if (!startupOk) {
  logger.error("One or more required secrets are missing. The server will start but auth and encryption will fail. Set the missing secrets and restart.");
}

const syncProvider = process.env["BANK_SYNC_PROVIDER"] ?? "simplefin";
if (syncProvider === "mock") {
  logger.warn("BANK_SYNC_PROVIDER=mock — demo mode active. No real financial accounts will be accessed.");
} else if (syncProvider === "simplefin") {
  logger.info("BANK_SYNC_PROVIDER=simplefin — real SimpleFIN sync enabled.");
} else {
  logger.warn({ syncProvider }, "Unknown BANK_SYNC_PROVIDER value. Defaulting to SimpleFIN.");
}

// ── Port validation ────────────────────────────────────────────────────────
const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port, syncProvider }, "Server listening");
});
