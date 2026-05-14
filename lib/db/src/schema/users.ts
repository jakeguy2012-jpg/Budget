import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { householdsTable } from "./households";

export const userRoleEnum = pgEnum("user_role", ["admin", "viewer_editor"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  householdId: text("household_id").notNull().references(() => householdsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
