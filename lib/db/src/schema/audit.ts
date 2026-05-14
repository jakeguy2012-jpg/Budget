import { pgTable, text, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";
import { usersTable } from "./users";

export const auditActionEnum = pgEnum("audit_action", [
  "login", "connection_added", "connection_updated", "connection_deleted",
  "sync_started", "sync_completed", "sync_failed",
  "category_changed", "budget_changed"
]);

export const auditLogsTable = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  action: auditActionEnum("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
