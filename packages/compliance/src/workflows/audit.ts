import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import type { AuditEntityType } from "../constants";
import { complianceAuditEntry } from "../db-schema";
import { type AuditTrailFilters, AuditTrailFiltersSchema } from "../types";

export interface AuditDeps {
  db: NodePgDatabase;
}

export async function getAuditTrail(
  entityType: AuditEntityType,
  entityId: string,
  { db }: AuditDeps,
) {
  return db
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

export async function listAuditEntries(
  filters: AuditTrailFilters | undefined,
  { db }: AuditDeps,
) {
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

  return db
    .select()
    .from(complianceAuditEntry)
    .where(whereClause)
    .orderBy(desc(complianceAuditEntry.performedAt));
}

export async function exportAuditEntries(
  filters: AuditTrailFilters | undefined,
  deps: AuditDeps,
) {
  const entries = await listAuditEntries(filters, deps);

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
