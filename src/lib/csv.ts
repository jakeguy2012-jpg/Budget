import Papa from 'papaparse';
import crypto from 'crypto';

export type CsvMapping = { date: string; description: string; merchant?: string; amount: string; accountName?: string; transactionType?: string };

export function parseTransactionsCsv(csv: string, mapping: CsvMapping) {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  return parsed.data.map((row) => {
    const amount = Number(String(row[mapping.amount] ?? '0').replace(/[$,]/g, ''));
    const description = row[mapping.description] ?? '';
    const date = new Date(row[mapping.date]);
    const fingerprint = crypto.createHash('sha256').update([row[mapping.accountName ?? ''] ?? '', date.toISOString().slice(0, 10), amount.toFixed(2), description].join('|')).digest('hex');
    return { date, amount, description, merchantName: mapping.merchant ? row[mapping.merchant] : undefined, accountName: mapping.accountName ? row[mapping.accountName] : undefined, transactionType: mapping.transactionType ? row[mapping.transactionType] : undefined, fingerprint };
  });
}
