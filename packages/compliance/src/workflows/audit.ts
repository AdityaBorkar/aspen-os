import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import type { AuditEntityType } from "../constants";
import { complianceAuditEntry } from "../db-schema";
import { type AuditTrailFilters, AuditTrailFiltersSchema } from "../types";

export class AuditWorkflow {
  constructor(private readonly db: NodePgDatabase) {}

  async getAuditTrail(entityType: AuditEntityType, entityId: string) {
    return this.db
      .select()
      .from(complianceAuditEntry)
      .where(
        and(
          eq(complianceAuditEntry.entityType, entityType),
          eq(complianceAuditEntry.entityId, entityId),
        ),
      )
      .orderBy(asc(complianceAuditEntry.performedAt));
  }

  async list(filters?: AuditTrailFilters) {
    const parsed = filters ? parse(AuditTrailFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.entityType) {
      conditions.push(eq(complianceAuditEntry.entityType, parsed.entityType));
    }
    if (parsed.action) {
      conditions.push(eq(complianceAuditEntry.action, parsed.action));
    }
    if (parsed.performedBy) {
      conditions.push(eq(complianceAuditEntry.performedBy, parsed.performedBy));
    }
    if (parsed.dateFrom) {
      conditions.push(gte(complianceAuditEntry.performedAt, parsed.dateFrom));
    }
    if (parsed.dateTo) {
      conditions.push(lte(complianceAuditEntry.performedAt, parsed.dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(complianceAuditEntry)
      .where(whereClause)
      .orderBy(desc(complianceAuditEntry.performedAt));
  }

  async export(filters?: AuditTrailFilters) {
    const entries = await this.list(filters);

    return entries.map((entry) => ({
      action: entry.action,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      entityId: entry.entityId,
      entityType: entry.entityType,
      id: entry.id,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      newState: entry.newState ? JSON.stringify(entry.newState) : null,
      notes: entry.notes,
      performedAt: entry.performedAt.toISOString(),
      performedBy: entry.performedBy,
      previousState: entry.previousState
        ? JSON.stringify(entry.previousState)
        : null,
    }));
  }
}
