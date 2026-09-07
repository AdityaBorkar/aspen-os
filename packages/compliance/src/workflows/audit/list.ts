import type { AuditTrailFilters } from "#/schemas";
import { fetchAuditEntries } from "#/workflows/audit/shared";

import { Workflow } from "@aspen-os/platform/server";

const listAuditEntries = Workflow.name("audit.list").handler(
  async (input: { filters?: AuditTrailFilters }, ctx) => fetchAuditEntries(ctx, input.filters),
);

export { listAuditEntries };
