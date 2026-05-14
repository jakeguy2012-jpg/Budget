import { pgTable, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";

export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").default("#2563eb").notNull(),
  icon: text("icon").default("circle").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique().on(t.householdId, t.name)]);

export type Category = typeof categoriesTable.$inferSelect;
