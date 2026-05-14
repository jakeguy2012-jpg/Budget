/**
 * Mock / demo bank sync provider.
 *
 * Used when BANK_SYNC_PROVIDER=mock.
 * Produces stable, realistic household finance data with deterministic
 * providerTransactionId values so repeated syncs never duplicate records.
 *
 * NO real bank connection. NO SimpleFIN Bridge required.
 */

interface MockAccount {
  providerAccountId: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  currentBalance: number;
  currency: string;
}

interface MockTransaction {
  providerTransactionId: string;
  providerAccountId: string;
  date: Date;
  description: string;
  merchantName?: string;
  amount: number;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    providerAccountId: "mock-checking-001",
    name: "Demo Checking",
    type: "depository",
    subtype: "checking",
    mask: "4321",
    currentBalance: 4823.41,
    currency: "USD",
  },
  {
    providerAccountId: "mock-savings-001",
    name: "Demo Savings",
    type: "depository",
    subtype: "savings",
    mask: "8876",
    currentBalance: 12400.0,
    currency: "USD",
  },
  {
    providerAccountId: "mock-credit-001",
    name: "Demo Credit Card",
    type: "credit",
    subtype: "credit card",
    mask: "5555",
    currentBalance: -1234.56,
    currency: "USD",
  },
];

// Stable mock transactions — IDs are deterministic so repeated syncs are idempotent
export const MOCK_TRANSACTIONS: MockTransaction[] = [
  // ── Income (checking) ──────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-payroll-01",   providerAccountId: "mock-checking-001", date: daysAgo(2),  description: "DIRECT DEPOSIT PAYROLL",              amount:  3500.00 },
  { providerTransactionId: "mock-tx-payroll-02",   providerAccountId: "mock-checking-001", date: daysAgo(17), description: "DIRECT DEPOSIT PAYROLL",              amount:  3500.00 },
  { providerTransactionId: "mock-tx-payroll-03",   providerAccountId: "mock-checking-001", date: daysAgo(32), description: "DIRECT DEPOSIT PAYROLL",              amount:  3500.00 },
  { providerTransactionId: "mock-tx-payroll-04",   providerAccountId: "mock-checking-001", date: daysAgo(47), description: "DIRECT DEPOSIT PAYROLL",              amount:  3500.00 },
  { providerTransactionId: "mock-tx-payroll-05",   providerAccountId: "mock-checking-001", date: daysAgo(62), description: "DIRECT DEPOSIT PAYROLL",              amount:  3500.00 },
  { providerTransactionId: "mock-tx-payroll-06",   providerAccountId: "mock-checking-001", date: daysAgo(77), description: "DIRECT DEPOSIT PAYROLL",              amount:  3500.00 },
  // ── Transfer checking → savings ────────────────────────────────────────
  { providerTransactionId: "mock-tx-xfer-sv-01",  providerAccountId: "mock-checking-001", date: daysAgo(3),  description: "ONLINE TRANSFER TO SAVINGS",          amount:  -500.00 },
  { providerTransactionId: "mock-tx-xfer-sv-02",  providerAccountId: "mock-checking-001", date: daysAgo(33), description: "ONLINE TRANSFER TO SAVINGS",          amount:  -500.00 },
  { providerTransactionId: "mock-tx-xfer-in-01",  providerAccountId: "mock-savings-001",  date: daysAgo(3),  description: "ONLINE TRANSFER FROM CHECKING",       amount:   500.00 },
  { providerTransactionId: "mock-tx-xfer-in-02",  providerAccountId: "mock-savings-001",  date: daysAgo(33), description: "ONLINE TRANSFER FROM CHECKING",       amount:   500.00 },
  // ── Groceries ─────────────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-groc-01",     providerAccountId: "mock-credit-001",   date: daysAgo(1),  description: "WHOLE FOODS MARKET",  merchantName: "Whole Foods",    amount:  -94.23 },
  { providerTransactionId: "mock-tx-groc-02",     providerAccountId: "mock-credit-001",   date: daysAgo(8),  description: "KROGER #1245",        merchantName: "Kroger",         amount:  -67.89 },
  { providerTransactionId: "mock-tx-groc-03",     providerAccountId: "mock-credit-001",   date: daysAgo(15), description: "TRADER JOE S",        merchantName: "Trader Joe's",   amount:  -81.14 },
  { providerTransactionId: "mock-tx-groc-04",     providerAccountId: "mock-credit-001",   date: daysAgo(22), description: "WHOLE FOODS MARKET",  merchantName: "Whole Foods",    amount:  -102.67 },
  { providerTransactionId: "mock-tx-groc-05",     providerAccountId: "mock-credit-001",   date: daysAgo(36), description: "KROGER #1245",        merchantName: "Kroger",         amount:  -59.44 },
  { providerTransactionId: "mock-tx-groc-06",     providerAccountId: "mock-credit-001",   date: daysAgo(50), description: "WHOLE FOODS MARKET",  merchantName: "Whole Foods",    amount:  -88.12 },
  { providerTransactionId: "mock-tx-groc-07",     providerAccountId: "mock-credit-001",   date: daysAgo(64), description: "TRADER JOE S",        merchantName: "Trader Joe's",   amount:  -74.30 },
  { providerTransactionId: "mock-tx-groc-08",     providerAccountId: "mock-credit-001",   date: daysAgo(78), description: "KROGER #1245",        merchantName: "Kroger",         amount:  -61.50 },
  // ── Dining ────────────────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-dine-01",     providerAccountId: "mock-credit-001",   date: daysAgo(2),  description: "CHIPOTLE MEXICAN GRILL", merchantName: "Chipotle",     amount:  -18.45 },
  { providerTransactionId: "mock-tx-dine-02",     providerAccountId: "mock-credit-001",   date: daysAgo(5),  description: "DOORDASH*THAI PALACE",   merchantName: "DoorDash",     amount:  -34.78 },
  { providerTransactionId: "mock-tx-dine-03",     providerAccountId: "mock-credit-001",   date: daysAgo(9),  description: "STARBUCKS #09432",       merchantName: "Starbucks",    amount:   -7.15 },
  { providerTransactionId: "mock-tx-dine-04",     providerAccountId: "mock-credit-001",   date: daysAgo(13), description: "OLIVE GARDEN #4421",     merchantName: "Olive Garden", amount:  -58.92 },
  { providerTransactionId: "mock-tx-dine-05",     providerAccountId: "mock-credit-001",   date: daysAgo(19), description: "STARBUCKS #09432",       merchantName: "Starbucks",    amount:   -6.75 },
  { providerTransactionId: "mock-tx-dine-06",     providerAccountId: "mock-credit-001",   date: daysAgo(24), description: "CHIPOTLE MEXICAN GRILL", merchantName: "Chipotle",     amount:  -21.00 },
  { providerTransactionId: "mock-tx-dine-07",     providerAccountId: "mock-credit-001",   date: daysAgo(38), description: "DOORDASH*PIZZA PLACE",   merchantName: "DoorDash",     amount:  -29.50 },
  { providerTransactionId: "mock-tx-dine-08",     providerAccountId: "mock-credit-001",   date: daysAgo(52), description: "STARBUCKS #09432",       merchantName: "Starbucks",    amount:   -8.40 },
  // ── Utilities ─────────────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-util-elec-01", providerAccountId: "mock-checking-001", date: daysAgo(5),  description: "CITY ELECTRIC CO",   amount:  -112.44 },
  { providerTransactionId: "mock-tx-util-elec-02", providerAccountId: "mock-checking-001", date: daysAgo(35), description: "CITY ELECTRIC CO",   amount:  -98.22 },
  { providerTransactionId: "mock-tx-util-elec-03", providerAccountId: "mock-checking-001", date: daysAgo(65), description: "CITY ELECTRIC CO",   amount:  -103.77 },
  { providerTransactionId: "mock-tx-util-gas-01",  providerAccountId: "mock-checking-001", date: daysAgo(6),  description: "GAS & WATER UTILITY", amount:   -64.18 },
  { providerTransactionId: "mock-tx-util-gas-02",  providerAccountId: "mock-checking-001", date: daysAgo(36), description: "GAS & WATER UTILITY", amount:   -71.50 },
  { providerTransactionId: "mock-tx-util-net-01",  providerAccountId: "mock-checking-001", date: daysAgo(7),  description: "XFINITY INTERNET",   amount:   -59.99 },
  { providerTransactionId: "mock-tx-util-net-02",  providerAccountId: "mock-checking-001", date: daysAgo(37), description: "XFINITY INTERNET",   amount:   -59.99 },
  { providerTransactionId: "mock-tx-util-net-03",  providerAccountId: "mock-checking-001", date: daysAgo(67), description: "XFINITY INTERNET",   amount:   -59.99 },
  // ── Mortgage / Rent ───────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-rent-01",     providerAccountId: "mock-checking-001", date: daysAgo(4),  description: "MORTGAGE PMT - FIRST NATIONAL BANK", amount: -1850.00 },
  { providerTransactionId: "mock-tx-rent-02",     providerAccountId: "mock-checking-001", date: daysAgo(34), description: "MORTGAGE PMT - FIRST NATIONAL BANK", amount: -1850.00 },
  { providerTransactionId: "mock-tx-rent-03",     providerAccountId: "mock-checking-001", date: daysAgo(64), description: "MORTGAGE PMT - FIRST NATIONAL BANK", amount: -1850.00 },
  // ── Transport / Gas ───────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-gas-01",      providerAccountId: "mock-credit-001",   date: daysAgo(3),  description: "SHELL OIL 12345678",   merchantName: "Shell",    amount:  -54.80 },
  { providerTransactionId: "mock-tx-gas-02",      providerAccountId: "mock-credit-001",   date: daysAgo(11), description: "BP#1234567890",        merchantName: "BP",       amount:  -48.95 },
  { providerTransactionId: "mock-tx-gas-03",      providerAccountId: "mock-credit-001",   date: daysAgo(25), description: "SHELL OIL 12345678",   merchantName: "Shell",    amount:  -62.10 },
  { providerTransactionId: "mock-tx-gas-04",      providerAccountId: "mock-credit-001",   date: daysAgo(40), description: "BP#1234567890",        merchantName: "BP",       amount:  -51.30 },
  { providerTransactionId: "mock-tx-gas-05",      providerAccountId: "mock-credit-001",   date: daysAgo(55), description: "SHELL OIL 12345678",   merchantName: "Shell",    amount:  -47.60 },
  // ── Subscriptions ─────────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-sub-nflx-01", providerAccountId: "mock-credit-001",   date: daysAgo(6),  description: "NETFLIX.COM",    merchantName: "Netflix",    amount:  -15.49 },
  { providerTransactionId: "mock-tx-sub-nflx-02", providerAccountId: "mock-credit-001",   date: daysAgo(36), description: "NETFLIX.COM",    merchantName: "Netflix",    amount:  -15.49 },
  { providerTransactionId: "mock-tx-sub-nflx-03", providerAccountId: "mock-credit-001",   date: daysAgo(66), description: "NETFLIX.COM",    merchantName: "Netflix",    amount:  -15.49 },
  { providerTransactionId: "mock-tx-sub-spot-01", providerAccountId: "mock-credit-001",   date: daysAgo(6),  description: "SPOTIFY USA",    merchantName: "Spotify",    amount:  -10.99 },
  { providerTransactionId: "mock-tx-sub-spot-02", providerAccountId: "mock-credit-001",   date: daysAgo(36), description: "SPOTIFY USA",    merchantName: "Spotify",    amount:  -10.99 },
  { providerTransactionId: "mock-tx-sub-spot-03", providerAccountId: "mock-credit-001",   date: daysAgo(66), description: "SPOTIFY USA",    merchantName: "Spotify",    amount:  -10.99 },
  { providerTransactionId: "mock-tx-sub-goog-01", providerAccountId: "mock-credit-001",   date: daysAgo(6),  description: "GOOGLE *GSUITE", merchantName: "Google",     amount:   -6.00 },
  { providerTransactionId: "mock-tx-sub-goog-02", providerAccountId: "mock-credit-001",   date: daysAgo(36), description: "GOOGLE *GSUITE", merchantName: "Google",     amount:   -6.00 },
  // ── Insurance ─────────────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-ins-auto-01", providerAccountId: "mock-checking-001", date: daysAgo(10), description: "STATE FARM AUTO INS",    amount:  -186.00 },
  { providerTransactionId: "mock-tx-ins-auto-02", providerAccountId: "mock-checking-001", date: daysAgo(40), description: "STATE FARM AUTO INS",    amount:  -186.00 },
  { providerTransactionId: "mock-tx-ins-auto-03", providerAccountId: "mock-checking-001", date: daysAgo(70), description: "STATE FARM AUTO INS",    amount:  -186.00 },
  { providerTransactionId: "mock-tx-ins-health-01", providerAccountId: "mock-checking-001", date: daysAgo(11), description: "ANTHEM HEALTH PREMIUM", amount:  -320.00 },
  { providerTransactionId: "mock-tx-ins-health-02", providerAccountId: "mock-checking-001", date: daysAgo(41), description: "ANTHEM HEALTH PREMIUM", amount:  -320.00 },
  // ── Shopping ──────────────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-shop-amz-01", providerAccountId: "mock-credit-001",   date: daysAgo(4),  description: "AMAZON.COM*AB12CD34",  merchantName: "Amazon",   amount:  -43.98 },
  { providerTransactionId: "mock-tx-shop-amz-02", providerAccountId: "mock-credit-001",   date: daysAgo(20), description: "AMAZON.COM*XY98ZT12",  merchantName: "Amazon",   amount:  -128.00 },
  { providerTransactionId: "mock-tx-shop-tgt-01", providerAccountId: "mock-credit-001",   date: daysAgo(12), description: "TARGET 0001234",       merchantName: "Target",   amount:  -67.45 },
  { providerTransactionId: "mock-tx-shop-tgt-02", providerAccountId: "mock-credit-001",   date: daysAgo(45), description: "TARGET 0001234",       merchantName: "Target",   amount:  -34.12 },
  // ── Health ────────────────────────────────────────────────────────────
  { providerTransactionId: "mock-tx-hlth-01",     providerAccountId: "mock-credit-001",   date: daysAgo(14), description: "CVS PHARMACY #8834",   merchantName: "CVS",      amount:  -28.47 },
  { providerTransactionId: "mock-tx-hlth-02",     providerAccountId: "mock-credit-001",   date: daysAgo(30), description: "WALGREENS #00112",     merchantName: "Walgreens",amount:  -19.95 },
  // ── Credit card payment (checking → credit) ───────────────────────────
  { providerTransactionId: "mock-tx-cc-pay-01",   providerAccountId: "mock-checking-001", date: daysAgo(7),  description: "ONLINE PMT DEMO CREDIT CARD", amount: -1100.00 },
  { providerTransactionId: "mock-tx-cc-pay-02",   providerAccountId: "mock-checking-001", date: daysAgo(37), description: "ONLINE PMT DEMO CREDIT CARD", amount:  -950.00 },
];
