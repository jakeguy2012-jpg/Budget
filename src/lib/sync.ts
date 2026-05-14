import { Prisma, ProviderType } from '@prisma/client';
import { prisma } from './db';
import { audit } from './audit';
import { decryptSecret } from './crypto';
import { SimpleFinProvider } from '@/providers/simplefin';
import type { ReadOnlyFinancialProvider } from '@/providers/types';
import { likelyDirection, ruleMatches } from './rules';

export async function providerForConnection(connectionId: string): Promise<ReadOnlyFinancialProvider> {
  const connection = await prisma.financialConnection.findUniqueOrThrow({ where: { id: connectionId } });
  if (connection.provider === 'simplefin') {
    if (!connection.encryptedCredentials) throw new Error('SimpleFIN credentials are missing');
    return new SimpleFinProvider(decryptSecret(connection.encryptedCredentials));
  }
  throw new Error(`${connection.provider} sync is not implemented yet`);
}

export async function syncConnection(connectionId: string, startDate: Date, endDate: Date) {
  const connection = await prisma.financialConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const run = await prisma.syncRun.create({ data: { connectionId, provider: connection.provider, status: 'running' } });
  await audit(connection.householdId, 'sync_started', { entityType: 'FinancialConnection', entityId: connectionId });
  try {
    const provider = await providerForConnection(connectionId);
    const accounts = await provider.listAccounts();
    for (const account of accounts) {
      await prisma.account.upsert({
        where: { connectionId_providerAccountId: { connectionId, providerAccountId: account.providerAccountId } },
        create: { ...account, connectionId },
        update: { name: account.name, officialName: account.officialName, type: account.type, subtype: account.subtype, mask: account.mask, currentBalance: account.currentBalance, availableBalance: account.availableBalance, currency: account.currency, isActive: true }
      });
    }
    const accountRows = await prisma.account.findMany({ where: { connectionId } });
    const accountByProviderId = new Map(accountRows.map((account) => [account.providerAccountId, account]));
    const rules = await prisma.categoryRule.findMany({ where: { householdId: connection.householdId, isActive: true }, orderBy: { priority: 'asc' } });
    let inserted = 0;
    let updated = 0;
    for (const tx of await provider.syncTransactions(startDate, endDate)) {
      const account = accountByProviderId.get(tx.providerAccountId);
      if (!account) continue;
      const matchedRule = rules.find((rule) => ruleMatches(rule, { ...tx, accountId: account.id, amount: new Prisma.Decimal(tx.amount) }));
      const existing = await prisma.transaction.findUnique({ where: { accountId_providerTransactionId: { accountId: account.id, providerTransactionId: tx.providerTransactionId } } });
      await prisma.transaction.upsert({
        where: { accountId_providerTransactionId: { accountId: account.id, providerTransactionId: tx.providerTransactionId } },
        create: { accountId: account.id, providerTransactionId: tx.providerTransactionId, date: tx.date, postedDate: tx.postedDate, description: tx.description, merchantName: tx.merchantName, originalDescription: tx.originalDescription, amount: tx.amount, direction: likelyDirection(tx.amount), categoryId: matchedRule?.categoryId, excludedFromBudget: matchedRule?.excludeFromBudget ?? false },
        update: { date: tx.date, postedDate: tx.postedDate, description: tx.description, merchantName: tx.merchantName, originalDescription: tx.originalDescription, amount: tx.amount }
      });
      existing ? updated++ : inserted++;
    }
    await prisma.financialConnection.update({ where: { id: connectionId }, data: { lastSyncedAt: new Date() } });
    await prisma.syncRun.update({ where: { id: run.id }, data: { status: 'completed', endedAt: new Date(), accountsSynced: accounts.length, transactionsInserted: inserted, transactionsUpdated: updated } });
    await audit(connection.householdId, 'sync_completed', { entityType: 'FinancialConnection', entityId: connectionId, metadata: { inserted, updated } });
  } catch (error) {
    await prisma.syncRun.update({ where: { id: run.id }, data: { status: 'failed', endedAt: new Date(), errorMessage: error instanceof Error ? error.message : 'Unknown error' } });
    await audit(connection.householdId, 'sync_failed', { entityType: 'FinancialConnection', entityId: connectionId });
    throw error;
  }
}
