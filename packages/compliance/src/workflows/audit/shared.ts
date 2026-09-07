import type { AuditTrailFilters } from "#/schemas";
import { AuditTrailFiltersSchema } from "#/schemas";
import type { AuditEntityType } from "#/utils/constants";
import { normalize, toFilter } from "#/workflows/utils";
import type { AuditTrailFilter } from "#/workflows/utils";

import type { WorkflowContext } from "@aspen-os/platform/server";
import { parse } from "valibot";

export async function fetchAuditEntries(
  ctx: WorkflowContext,
  filters?: AuditTrailFilters,
  entity?: { entityId: string; entityType: AuditEntityType },
) {
  const parsed = filters ? parse(AuditTrailFiltersSchema, filters) : {};
  const filter: AuditTrailFilter = toFilter(parsed);
  if (entity) {
    filter.entityId = entity.entityId;
    filter.entityType = entity.entityType;
  }
  const rows = await ctx.audit.query(filter);
  return rows.map(normalize);
}

export function serializeAuditEntry(entry: ReturnType<typeof normalize>) {
  return {
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
    previousState: entry.previousState ? JSON.stringify(entry.previousState) : null,
  };
}
