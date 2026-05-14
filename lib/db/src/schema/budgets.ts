import { pgTable, text, timestamp, decimal, unique } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";
import { categoriesTable } from "./categories";

export const budgetsTable = pgTable("budgets", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  month: timestamp("month").notNull(),
  planned: decimal("planned", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique().on(t.householdId, t.categoryId, t.month)]);

export type Budget = typeof budgetsTable.$inferSelect;
