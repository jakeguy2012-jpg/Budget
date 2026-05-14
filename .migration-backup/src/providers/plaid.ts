import { ReadOnlyFinancialProvider } from './types';

export class PlaidReadOnlyProvider implements ReadOnlyFinancialProvider {
  readonly name = 'plaid';
  async testConnection() { return false; }
  async listAccounts(): Promise<never> { throw new Error('Plaid placeholder only: add Plaid Link and read-only Transactions/Balance setup before enabling.'); }
  async getBalances(): Promise<never> { throw new Error('Plaid placeholder only: use /accounts/balance and never Auth, payment initiation, or transfer products.'); }
  async syncTransactions(): Promise<never> { throw new Error('Plaid placeholder only: store encrypted access tokens and use Transactions Sync when configured.'); }
}
