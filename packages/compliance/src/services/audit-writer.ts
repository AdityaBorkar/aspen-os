import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AuditAction, AuditEntityType } from "../constants";
import { complianceAuditEntry } from "../db-schema";

export interface AuditEntryInput {
  action: AuditAction;
  changes?: Record<string, { new: unknown; old: unknown }>;
  entityId: string;
  entityType: AuditEntityType;
  metadata?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  notes?: string;
  performedBy?: string | null;
  previousState?: Record<string, unknown>;
}

export interface AuditWriterDeps {
  db: NodePgDatabase;
}

export async function writeAuditEntry(
  entry: AuditEntryInput,
  { db }: AuditWriterDeps,
): Promise<void> {
  await db.insert(complianceAuditEntry).values({
    action: entry.action,
    changes: entry.changes ?? null,
    entityId: entry.entityId,
    entityType: entry.entityType,
    metadata: entry.metadata ?? null,
    newState: entry.newState ?? null,
    notes: entry.notes ?? null,
    performedBy: entry.performedBy ?? null,
    previousState: entry.previousState ?? null,
  });
}

export async function writeSystemAudit(
  input: {
    action: AuditAction;
    entityId: string;
    entityType: AuditEntityType;
    metadata?: Record<string, unknown>;
    notes?: string;
  },
  { db }: AuditWriterDeps,
): Promise<void> {
  await writeAuditEntry(
    {
      action: input.action,
      entityId: input.entityId,
      entityType: input.entityType,
      metadata: { system: true, ...input.metadata },
      notes: input.notes,
      performedBy: null,
    },
    { db },
  );
}
