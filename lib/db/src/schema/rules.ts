import { pgTable, text, timestamp, boolean, integer, decimal, index } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";
import { categoriesTable } from "./categories";

export const categoryRulesTable = pgTable("category_rules", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  merchantContains: text("merchant_contains"),
  descriptionContains: text("description_contains"),
  accountId: text("account_id"),
  excludeFromBudget: boolean("exclude_from_budget").default(false).notNull(),
  priority: integer("priority").default(100).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("rules_household_priority_idx").on(t.householdId, t.priority),
]);

export type CategoryRule = typeof categoryRulesTable.$inferSelect;
