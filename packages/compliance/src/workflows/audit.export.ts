import { Workflow } from "@aspen-os/platform/server";
import { parse } from "valibot";

import { type AuditTrailFilters, AuditTrailFiltersSchema } from "../types";
import { type AuditLogRow, type ComplianceAuditEntry, normalize, toFilter } from "./utils";

const exportAuditEntries = Workflow.name("audit.export").handler(
  async (input: { filters?: AuditTrailFilters }, ctx) => {
    const rows = (await ctx.step.run("query", async () => {
      const { filters } = input;
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
      previousState: entry.previousState ? JSON.stringify(entry.previousState) : null,
    }));
  },
);

export { exportAuditEntries };
