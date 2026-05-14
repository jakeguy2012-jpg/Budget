import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";

export const providerTypeEnum = pgEnum("provider_type", ["simplefin", "csv", "plaid", "demo"]);

export const connectionsTable = pgTable("financial_connections", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  provider: providerTypeEnum("provider").notNull(),
  name: text("name").notNull(),
  encryptedCredentials: text("encrypted_credentials"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const syncStatusEnum = pgEnum("sync_status", ["running", "completed", "failed"]);

export const syncRunsTable = pgTable("sync_runs", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").notNull().references(() => connectionsTable.id, { onDelete: "cascade" }),
  provider: providerTypeEnum("provider").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  status: syncStatusEnum("status").notNull(),
  accountsSynced: text("accounts_synced").default("0").notNull(),
  transactionsInserted: text("transactions_inserted").default("0").notNull(),
  transactionsUpdated: text("transactions_updated").default("0").notNull(),
  errorMessage: text("error_message"),
});

export type Connection = typeof connectionsTable.$inferSelect;
export type SyncRun = typeof syncRunsTable.$inferSelect;
