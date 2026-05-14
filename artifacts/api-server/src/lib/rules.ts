import type { CategoryRule, Transaction } from "@workspace/db";

type RuleTarget = Pick<Transaction, "description" | "amount" | "accountId"> & { merchantName?: string | null };

export function ruleMatches(rule: CategoryRule, tx: RuleTarget) {
  const merchant = (tx.merchantName ?? "").toUpperCase();
  const description = (tx.description ?? "").toUpperCase();
  const amount = Math.abs(Number(tx.amount));
  if (rule.merchantContains && !merchant.includes(rule.merchantContains.toUpperCase())) return false;
  if (rule.descriptionContains && !description.includes(rule.descriptionContains.toUpperCase())) return false;
  if (rule.accountId && rule.accountId !== tx.accountId) return false;
  return true;
}

export function likelyDirection(amount: number): "income" | "expense" | "transfer" {
  return amount > 0 ? "income" : "expense";
}
