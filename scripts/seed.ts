import { db, usersTable, householdsTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function cuid() {
  return `c${Date.now().toString(36)}${crypto.randomBytes(8).toString("base64url")}`;
}

const DEFAULT_CATEGORIES = [
  { name: "Groceries", color: "#16a34a", icon: "shopping-cart" },
  { name: "Dining", color: "#f97316", icon: "utensils" },
  { name: "Transport", color: "#2563eb", icon: "car" },
  { name: "Utilities", color: "#7c3aed", icon: "zap" },
  { name: "Entertainment", color: "#db2777", icon: "film" },
  { name: "Health", color: "#0891b2", icon: "heart" },
  { name: "Clothing", color: "#ca8a04", icon: "shirt" },
  { name: "Home", color: "#65a30d", icon: "home" },
  { name: "Travel", color: "#4f46e5", icon: "plane" },
  { name: "Savings", color: "#059669", icon: "piggy-bank" },
  { name: "Income", color: "#16a34a", icon: "dollar-sign" },
  { name: "Transfer", color: "#6b7280", icon: "arrows-right-left" },
];

async function seed() {
  console.log("Seeding...");

  // Upsert household
  const householdId = "household-main";
  const existing = await db.select().from(householdsTable).where(eq(householdsTable.id, householdId)).limit(1);
  if (!existing[0]) {
    await db.insert(householdsTable).values({ id: householdId, name: "Our Family" });
    console.log("Created household");
  } else {
    console.log("Household already exists");
  }

  // Seed users
  const users = [
    { id: "user-jake", username: "jake", name: "Jake", role: "admin" as const, password: "demo1234" },
    { id: "user-wife", username: "wife", name: "Partner", role: "member" as const, password: "demo1234" },
  ];

  for (const u of users) {
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.id, u.id)).limit(1);
    const passwordHash = await bcrypt.hash(u.password, 12);
    if (!existingUser[0]) {
      await db.insert(usersTable).values({ id: u.id, householdId, username: u.username, name: u.name, role: u.role, passwordHash });
      console.log(`Created user: ${u.username}`);
    } else {
      await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, u.id));
      console.log(`Updated password for: ${u.username}`);
    }
  }

  // Seed categories
  const existingCats = await db.select().from(categoriesTable).where(eq(categoriesTable.householdId, householdId));
  if (existingCats.length === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.insert(categoriesTable).values({ id: cuid(), householdId, ...cat, isDefault: true });
    }
    console.log(`Created ${DEFAULT_CATEGORIES.length} default categories`);
  } else {
    console.log(`Categories already exist (${existingCats.length})`);
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
