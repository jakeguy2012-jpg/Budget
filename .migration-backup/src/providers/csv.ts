import { parseTransactionsCsv, CsvMapping } from '@/lib/csv';
import { ReadOnlyFinancialProvider } from './types';

export class CsvImportProvider implements ReadOnlyFinancialProvider {
  readonly name = 'csv';
  constructor(private csv: string, private mapping: CsvMapping) {}
  async testConnection() { return true; }
  async listAccounts() { return []; }
  async getBalances() { return []; }
  async syncTransactions() {
    return parseTransactionsCsv(this.csv, this.mapping).map((tx) => ({
      providerTransactionId: `csv-${tx.fingerprint}`,
      providerAccountId: tx.accountName ?? 'csv-import',
      date: tx.date,
      description: tx.description,
      merchantName: tx.merchantName,
      originalDescription: tx.description,
      amount: tx.amount
    }));
  }
}
