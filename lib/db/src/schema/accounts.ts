import { pgTable, text, timestamp, boolean, decimal, unique } from "drizzle-orm/pg-core";
import { connectionsTable } from "./connections";

export const accountsTable = pgTable("accounts", {
  id: text("id").primaryKey(),
  providerAccountId: text("provider_account_id").notNull(),
  connectionId: text("connection_id").notNull().references(() => connectionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  officialName: text("official_name"),
  type: text("type").notNull(),
  subtype: text("subtype"),
  mask: text("mask"),
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default("0").notNull(),
  availableBalance: decimal("available_balance", { precision: 12, scale: 2 }),
  currency: text("currency").default("USD").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique().on(t.connectionId, t.providerAccountId)]);

export type Account = typeof accountsTable.$inferSelect;
