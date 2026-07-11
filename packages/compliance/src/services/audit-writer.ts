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

export class AuditWriter {
  constructor(private readonly db: NodePgDatabase) {}

  async write(entry: AuditEntryInput): Promise<void> {
    await this.db.insert(complianceAuditEntry).values({
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

  async writeSystem(
    entityType: AuditEntityType,
    entityId: string,
    action: AuditAction,
    metadata?: Record<string, unknown>,
    notes?: string,
  ): Promise<void> {
    await this.write({
      action,
      entityId,
      entityType,
      metadata: { system: true, ...metadata },
      notes,
      performedBy: null,
    });
  }
}
