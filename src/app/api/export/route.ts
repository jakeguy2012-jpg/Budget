import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
function csv(rows: Array<Record<string, unknown>>) { const keys=Object.keys(rows[0]??{}); return [keys.join(','),...rows.map(r=>keys.map(k=>JSON.stringify(r[k]??'')).join(','))].join('\n'); }
export async function GET(request: NextRequest){
  const user=await getCurrentUser(); if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
  const type=request.nextUrl.searchParams.get('type');
  if(type==='budgets'){
    const rows=await prisma.budget.findMany({where:{householdId:user.householdId},include:{category:true}});
    return new NextResponse(csv(rows.map(b=>({month:b.month.toISOString().slice(0,7),category:b.category.name,planned:b.planned.toString()}))),{headers:{'content-type':'text/csv','content-disposition':'attachment; filename="budgets.csv"'}});
  }
  if(type==='json'){
    const data=await prisma.household.findUnique({where:{id:user.householdId},include:{users:true,categories:true,connections:{include:{accounts:{include:{transactions:true}},syncRuns:true}},budgets:true,budgetMonths:true,auditLogs:true}});
    return NextResponse.json(data);
  }
  const rows=await prisma.transaction.findMany({where:{account:{connection:{householdId:user.householdId}}},include:{account:true,category:true},orderBy:{date:'desc'}});
  return new NextResponse(csv(rows.map(t=>({date:t.date.toISOString().slice(0,10),account:t.account.name,merchant:t.merchantName,description:t.description,amount:t.amount.toString(),category:t.category?.name,reviewed:t.userReviewed,notes:t.notes}))),{headers:{'content-type':'text/csv','content-disposition':'attachment; filename="transactions.csv"'}});
}
