import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { syncConnection } from '@/lib/sync';
import { subDays } from 'date-fns';
export async function POST(request: Request,{params}:{params:{id:string}}){ const user=await getCurrentUser(); if(!user) return NextResponse.redirect(new URL('/login',request.url),303); await syncConnection(params.id, subDays(new Date(), Number(process.env.SIMPLEFIN_SYNC_DAYS ?? 90)), new Date()); return NextResponse.redirect(new URL('/connections',request.url),303); }
