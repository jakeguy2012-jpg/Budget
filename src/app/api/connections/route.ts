import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptSecret } from '@/lib/crypto';
import { audit } from '@/lib/audit';
export async function POST(request: NextRequest){ const user=await getCurrentUser(); if(!user) return NextResponse.redirect(new URL('/login',request.url),303); if(user.role!=='admin') return NextResponse.json({error:'Admins only'}, {status:403}); const form=await request.formData(); const provider=String(form.get('provider')); if(provider!=='simplefin') return NextResponse.json({error:'Only SimpleFIN can be added in MVP'}, {status:400}); const connection=await prisma.financialConnection.create({data:{householdId:user.householdId,provider:'simplefin',name:String(form.get('name')||'SimpleFIN'),encryptedCredentials:encryptSecret(String(form.get('credential')))}}); await audit(user.householdId,'connection_added',{userId:user.id,entityType:'FinancialConnection',entityId:connection.id}); return NextResponse.redirect(new URL('/connections',request.url),303); }
