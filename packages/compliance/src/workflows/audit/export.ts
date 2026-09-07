import type { AuditTrailFilters } from "#/schemas";
import { fetchAuditEntries, serializeAuditEntry } from "#/workflows/audit/shared";

import { Workflow } from "@aspen-os/platform/server";

const exportAuditEntries = Workflow.name("audit.export").handler(
  async (input: { filters?: AuditTrailFilters }, ctx) => {
    const rows = await ctx.step.run("query", async () => fetchAuditEntries(ctx, input.filters));

    return rows.map(serializeAuditEntry);
  },
);

export { exportAuditEntries };
