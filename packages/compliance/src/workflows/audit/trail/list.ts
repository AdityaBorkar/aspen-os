import type { AuditEntityType } from "#/utils/constants";
import { fetchAuditEntries } from "#/workflows/audit/shared";

import { Workflow } from "@aspen-os/platform/server";

const getAuditTrail = Workflow.name("audit.trail").handler(
  async (input: { entityType: AuditEntityType; entityId: string }, ctx) => {
    const rows = await fetchAuditEntries(ctx, undefined, {
      entityId: input.entityId,
      entityType: input.entityType,
    });

    // Platform returns newest-first (seq desc); trails read chronologically.
    return rows.toSorted((left, right) => left.performedAt.getTime() - right.performedAt.getTime());
  },
);

export { getAuditTrail };
