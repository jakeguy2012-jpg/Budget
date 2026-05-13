import cron from 'node-cron';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/db';
import { syncConnection } from '@/lib/sync';

async function runDailySync() {
  const connections = await prisma.financialConnection.findMany({ where: { isActive: true, provider: 'simplefin' } });
  for (const connection of connections) {
    try { await syncConnection(connection.id, subDays(new Date(), Number(process.env.SIMPLEFIN_SYNC_DAYS ?? 90)), new Date()); }
    catch (error) { console.error(`Sync failed for connection ${connection.id}:`, error instanceof Error ? error.message : 'Unknown error'); }
  }
}

if (process.env.ENABLE_DAILY_SYNC === 'true') {
  cron.schedule(process.env.DAILY_SYNC_CRON ?? '15 3 * * *', runDailySync);
  console.log('Daily read-only sync worker scheduled');
} else {
  console.log('Daily sync disabled. Set ENABLE_DAILY_SYNC=true to enable.');
}
