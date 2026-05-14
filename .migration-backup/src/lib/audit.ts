import type { AuditAction } from '@prisma/client';
import { prisma } from './db';

export async function audit(householdId: string, action: AuditAction, opts: { userId?: string; entityType?: string; entityId?: string; metadata?: Record<string, unknown> } = {}) {
  await prisma.auditLog.create({ data: { householdId, action, userId: opts.userId, entityType: opts.entityType, entityId: opts.entityId, metadata: opts.metadata ?? {} } });
}
