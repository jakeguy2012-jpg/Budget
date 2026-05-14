import { ReadOnlyFinancialProvider, ProviderAccount, ProviderTransaction } from './types';

type SimpleFinAccount = {
  id: string; name: string; org?: { name?: string }; currency?: string; balance?: string; "available-balance"?: string; extra?: { account_num?: string; account_type?: string };
  transactions?: Array<{ id: string; posted: number; amount: string; description: string; payee?: string }>;
};

export class SimpleFinProvider implements ReadOnlyFinancialProvider {
  readonly name = 'simplefin';
  constructor(private accessUrl: string) {}

  async testConnection() {
    const response = await fetch(this.accessUrl, { method: 'GET', headers: { Accept: 'application/json' } });
    return response.ok;
  }

  async listAccounts() {
    const data = await this.fetchAccounts();
    return data.map(this.mapAccount);
  }

  async getBalances() {
    return this.listAccounts();
  }

  async syncTransactions(startDate: Date, endDate: Date) {
    const url = new URL(this.accessUrl);
    url.searchParams.set('start-date', Math.floor(startDate.getTime() / 1000).toString());
    url.searchParams.set('end-date', Math.floor(endDate.getTime() / 1000).toString());
    const data = await this.fetchAccounts(url.toString());
    return data.flatMap((account) => (account.transactions ?? []).map((tx): ProviderTransaction => ({
      providerTransactionId: tx.id,
      providerAccountId: account.id,
      date: new Date(tx.posted * 1000),
      postedDate: new Date(tx.posted * 1000),
      description: tx.description,
      merchantName: tx.payee,
      originalDescription: tx.description,
      amount: Number(tx.amount)
    })));
  }

  private async fetchAccounts(url = this.accessUrl): Promise<SimpleFinAccount[]> {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`SimpleFIN request failed with ${response.status}`);
    const body = await response.json() as { accounts?: SimpleFinAccount[] };
    return body.accounts ?? [];
  }

  private mapAccount(account: SimpleFinAccount): ProviderAccount {
    const num = account.extra?.account_num;
    return {
      providerAccountId: account.id,
      name: account.name,
      officialName: account.org?.name,
      type: account.extra?.account_type ?? 'depository',
      subtype: account.extra?.account_type,
      mask: num ? num.slice(-4) : undefined,
      currentBalance: Number(account.balance ?? 0),
      availableBalance: account['available-balance'] ? Number(account['available-balance']) : undefined,
      currency: account.currency ?? 'USD'
    };
  }
}
