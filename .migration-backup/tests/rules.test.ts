import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { ruleMatches } from '../src/lib/rules';

const baseRule = { id:'r1', householdId:'h1', categoryId:'c1', merchantContains:null, descriptionContains:null, amountEquals:null, amountGreaterThan:null, amountLessThan:null, accountId:null, excludeFromBudget:false, priority:100, isActive:true, createdAt:new Date(), updatedAt:new Date() };

describe('ruleMatches', () => {
  it('matches merchant contains case-insensitively', () => {
    expect(ruleMatches({ ...baseRule, merchantContains: 'meijer' }, { merchantName: 'MEIJER STORE', description: 'sale', amount: new Prisma.Decimal(-50), accountId: 'a1' })).toBe(true);
  });
  it('checks amount thresholds against absolute spending amount', () => {
    expect(ruleMatches({ ...baseRule, amountGreaterThan: new Prisma.Decimal(100) }, { merchantName: 'Shop', description: 'purchase', amount: new Prisma.Decimal(-125), accountId: 'a1' })).toBe(true);
  });
});
