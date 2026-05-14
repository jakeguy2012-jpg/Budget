import { describe, expect, it } from 'vitest';
import { parseTransactionsCsv } from '../src/lib/csv';

describe('parseTransactionsCsv', () => {
  it('maps bank rows and creates stable fingerprints', () => {
    const rows = parseTransactionsCsv('date,description,amount,account\n2026-05-01,MEIJER,-45.12,Checking', { date:'date', description:'description', amount:'amount', accountName:'account' });
    expect(rows[0].description).toBe('MEIJER');
    expect(rows[0].fingerprint).toHaveLength(64);
  });
});
