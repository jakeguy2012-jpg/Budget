import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ruleMatches } from '@/lib/rules';
export async function POST(request: Request){ const user=await getCurrentUser(); if(!user) return NextResponse.redirect(new URL('/login',request.url),303); const rules=await prisma.categoryRule.findMany({where:{householdId:user.householdId,isActive:true},orderBy:{priority:'asc'}}); const txs=await prisma.transaction.findMany({where:{account:{connection:{householdId:user.householdId}},categoryId:null}}); for(const tx of txs){ const rule=rules.find(r=>ruleMatches(r,tx)); if(rule) await prisma.transaction.update({where:{id:tx.id},data:{categoryId:rule.categoryId,excludedFromBudget:rule.excludeFromBudget}}); } return NextResponse.redirect(new URL('/rules',request.url),303); }
