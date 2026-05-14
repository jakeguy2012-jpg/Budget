import { PrismaClient } from '@prisma/client';
import { addDays, startOfMonth, subMonths } from 'date-fns';
import { hashPassword } from '../src/lib/auth';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS } from '../src/lib/categories';

const prisma = new PrismaClient();
const merchants = ['MEIJER','SHELL','BP','NETFLIX','PAYROLL','TARGET','AMAZON','LOCAL RESTAURANT','DTE ENERGY','MORTGAGE SERVICING','CHILDCARE CENTER','VET CLINIC'];

async function main() {
  const existing = await prisma.household.count();
  if (existing > 0 && process.env.RESET_DEMO_DATA !== 'true') {
    console.log('Seed data already exists; set RESET_DEMO_DATA=true to recreate demo data.');
    return;
  }
  await prisma.auditLog.deleteMany(); await prisma.syncRun.deleteMany(); await prisma.transaction.deleteMany(); await prisma.budget.deleteMany(); await prisma.budgetMonth.deleteMany(); await prisma.categoryRule.deleteMany(); await prisma.category.deleteMany(); await prisma.account.deleteMany(); await prisma.financialConnection.deleteMany(); await prisma.user.deleteMany(); await prisma.household.deleteMany();
  const household = await prisma.household.create({ data: { name: 'Jake Family Household' } });
  await prisma.user.createMany({ data: [
    { householdId: household.id, name: 'Jake', username: 'jake', role: 'admin', passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? 'change-me-demo-admin') },
    { householdId: household.id, name: 'Wife', username: 'wife', role: 'viewer_editor', passwordHash: await hashPassword(process.env.SEED_WIFE_PASSWORD ?? 'change-me-demo-wife') }
  ] });
  const categories = new Map<string,string>();
  for (const [i, name] of DEFAULT_CATEGORIES.entries()) { const category = await prisma.category.create({ data: { householdId: household.id, name, color: CATEGORY_COLORS[i], isDefault: true } }); categories.set(name, category.id); }
  const connection = await prisma.financialConnection.create({ data: { householdId: household.id, provider: 'demo', name: 'Demo household data' } });
  const accounts = await Promise.all([
    prisma.account.create({ data: { connectionId: connection.id, providerAccountId: 'demo-checking', name: 'Family Checking', type: 'depository', subtype: 'checking', mask: '1234', currentBalance: 4200, currency: 'USD' } }),
    prisma.account.create({ data: { connectionId: connection.id, providerAccountId: 'demo-savings', name: 'Emergency Savings', type: 'depository', subtype: 'savings', mask: '5678', currentBalance: 15000, currency: 'USD' } }),
    prisma.account.create({ data: { connectionId: connection.id, providerAccountId: 'demo-visa', name: 'Family Visa', type: 'credit', subtype: 'credit card', mask: '9012', currentBalance: -850, currency: 'USD' } }),
    prisma.account.create({ data: { connectionId: connection.id, providerAccountId: 'demo-store', name: 'Store Card', type: 'credit', subtype: 'credit card', mask: '3456', currentBalance: -120, currency: 'USD' } })
  ]);
  const ruleData = [ ['MEIJER','Groceries'], ['SHELL','Gas'], ['BP','Gas'], ['NETFLIX','Subscriptions'], ['PAYROLL','Income'] ];
  for (const [merchant, category] of ruleData) await prisma.categoryRule.create({ data: { householdId: household.id, merchantContains: merchant, categoryId: categories.get(category)!, priority: 10 } });
  const now = new Date();
  for (let i = 0; i < 100; i++) {
    const merchant = merchants[i % merchants.length];
    const account = accounts[i % accounts.length];
    const date = addDays(startOfMonth(subMonths(now, i % 3)), i % 27);
    const isIncome = merchant === 'PAYROLL';
    const amount = isIncome ? 2400 : -1 * (12 + (i % 9) * 17);
    const category = merchant.includes('MEIJER') ? 'Groceries' : merchant.includes('SHELL') || merchant.includes('BP') ? 'Gas' : merchant.includes('NETFLIX') ? 'Subscriptions' : merchant.includes('PAYROLL') ? 'Income' : merchant.includes('MORTGAGE') ? 'Mortgage/Rent' : merchant.includes('DTE') ? 'Utilities' : undefined;
    await prisma.transaction.create({ data: { accountId: account.id, providerTransactionId: `demo-${i}`, date, postedDate: date, description: `${merchant} purchase`, merchantName: merchant, originalDescription: `${merchant} demo transaction`, amount, direction: isIncome ? 'income' : 'expense', categoryId: category ? categories.get(category) : undefined, userReviewed: Boolean(category) } });
  }
  const budgetCategories = ['Groceries','Restaurants','Gas','Mortgage/Rent','Utilities','Internet/Phone','Kids','Pets','Shopping','Subscriptions','Entertainment'];
  for (const name of budgetCategories) await prisma.budget.create({ data: { householdId: household.id, categoryId: categories.get(name)!, month: startOfMonth(now), planned: name === 'Mortgage/Rent' ? 1800 : name === 'Groceries' ? 800 : 150 } });
  await prisma.budgetMonth.create({ data: { householdId: household.id, month: startOfMonth(now), notes: 'Demo budget' } });
}

main().finally(() => prisma.$disconnect());
