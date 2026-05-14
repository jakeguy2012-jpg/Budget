import { pgTable, text, timestamp, boolean, decimal, index, unique, pgEnum } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";
import { categoriesTable } from "./categories";

export const transactionDirectionEnum = pgEnum("transaction_direction", ["income", "expense", "transfer"]);

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  providerTransactionId: text("provider_transaction_id"),
  accountId: text("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  postedDate: timestamp("posted_date"),
  description: text("description").notNull(),
  merchantName: text("merchant_name"),
  originalDescription: text("original_description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  direction: transactionDirectionEnum("direction").notNull(),
  categoryId: text("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  userReviewed: boolean("user_reviewed").default(false).notNull(),
  excludedFromBudget: boolean("excluded_from_budget").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.accountId, t.providerTransactionId),
  index("tx_date_idx").on(t.date),
  index("tx_category_idx").on(t.categoryId),
]);

export type Transaction = typeof transactionsTable.$inferSelect;
