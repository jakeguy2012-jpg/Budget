import { Prisma, type CategoryRule, type Transaction } from '@prisma/client';

export type RuleTarget = Pick<Transaction, 'description' | 'amount' | 'accountId'> & { merchantName?: string | null };

export function ruleMatches(rule: CategoryRule, tx: RuleTarget) {
  const merchant = (tx.merchantName ?? '').toUpperCase();
  const description = (tx.description ?? '').toUpperCase();
  const amount = new Prisma.Decimal(tx.amount).abs();
  if (rule.merchantContains && !merchant.includes(rule.merchantContains.toUpperCase())) return false;
  if (rule.descriptionContains && !description.includes(rule.descriptionContains.toUpperCase())) return false;
  if (rule.accountId && rule.accountId !== tx.accountId) return false;
  if (rule.amountEquals && !amount.equals(rule.amountEquals)) return false;
  if (rule.amountGreaterThan && !amount.greaterThan(rule.amountGreaterThan)) return false;
  if (rule.amountLessThan && !amount.lessThan(rule.amountLessThan)) return false;
  return true;
}

export function likelyDirection(amount: number) {
  if (amount > 0) return 'income' as const;
  return 'expense' as const;
}
