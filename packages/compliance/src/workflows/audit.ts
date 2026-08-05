import { Workflow } from "@aspen-os/platform/server";
import { parse } from "valibot";

import type { AuditEntityType } from "../constants";
import { type AuditTrailFilters, AuditTrailFiltersSchema } from "../types";

interface AuditLogRow {
  action: string;
  actorId: string | null;
  changes: Record<string, unknown> | null;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  performedAt: Date;
  previousState: Record<string, unknown> | null;
}

export interface ComplianceAuditEntry {
  action: string;
  changes: Record<string, { new: unknown; old: unknown }> | null;
  entityId: string;
  entityType: string;
  id: string;
  metadata: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  notes: string | null;
  performedAt: Date;
  performedBy: string | null;
  previousState: Record<string, unknown> | null;
}

function normalize(row: AuditLogRow): ComplianceAuditEntry {
  return {
    action: row.action,
    changes: (row.changes ?? null) as Record<
      string,
      { new: unknown; old: unknown }
    > | null,
    entityId: row.entityId,
    entityType: row.entityType,
    id: row.id,
    metadata: row.metadata,
    newState: row.newState,
    notes: null,
    performedAt: row.performedAt,
    performedBy: row.actorId,
    previousState: row.previousState,
  };
}

function toFilter(filters: AuditTrailFilters | undefined): {
  action?: string;
  actorId?: string;
  endTime?: Date;
  entityType?: string;
  startTime?: Date;
} {
  const filter: {
    action?: string;
    actorId?: string;
    endTime?: Date;
    entityType?: string;
    startTime?: Date;
  } = {};

  if (filters?.action) filter.action = filters.action;
  if (filters?.entityType) filter.entityType = filters.entityType;
  if (filters?.performedBy) filter.actorId = filters.performedBy;
  if (filters?.dateFrom) filter.startTime = filters.dateFrom;
  if (filters?.dateTo) filter.endTime = filters.dateTo;
  return filter;
}

const getAuditTrail = Workflow.name("audit.trail").handler(
  async (input: { entityType: AuditEntityType; entityId: string }, ctx) => {
    const rows = (await ctx.audit.query({
      entityId: input.entityId,
      entityType: input.entityType,
    })) as AuditLogRow[];

    return rows
      .map(normalize)
      .sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime());
  },
);

const listAuditEntries = Workflow.name("audit.list").handler(
  async (input: { filters?: AuditTrailFilters }, ctx) => {
    const filters = input.filters;
    const parsed = filters ? parse(AuditTrailFiltersSchema, filters) : {};

    const rows = (await ctx.audit.query(
      toFilter(parsed as AuditTrailFilters | undefined),
    )) as AuditLogRow[];

    return rows.map(normalize);
  },
);

const exportAuditEntries = Workflow.name("audit.export").handler(
  async (input: { filters?: AuditTrailFilters }, ctx) => {
    const rows = (await ctx.step.run("query", async () => {
      const filters = input.filters;
      const parsed = filters ? parse(AuditTrailFiltersSchema, filters) : {};
      const result = (await ctx.audit.query(
        toFilter(parsed as AuditTrailFilters | undefined),
      )) as AuditLogRow[];
      return result.map(normalize);
    })) as ComplianceAuditEntry[];

    return rows.map((entry) => ({
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
  },
);

export const audit = {
  export: exportAuditEntries,
  getAuditTrail,
  list: listAuditEntries,
} as const;
