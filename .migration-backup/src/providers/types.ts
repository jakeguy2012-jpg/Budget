export type ProviderAccount = {
  providerAccountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
  currency: string;
};

export type ProviderTransaction = {
  providerTransactionId: string;
  providerAccountId: string;
  date: Date;
  postedDate?: Date;
  description: string;
  merchantName?: string;
  originalDescription?: string;
  amount: number;
};

export interface ReadOnlyFinancialProvider {
  readonly name: string;
  listAccounts(): Promise<ProviderAccount[]>;
  syncTransactions(startDate: Date, endDate: Date): Promise<ProviderTransaction[]>;
  getBalances(): Promise<ProviderAccount[]>;
  testConnection(): Promise<boolean>;
}
