import type { AuditEntityType } from "#/utils/constants";
import { normalize } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";

const getAuditTrail = Workflow.name("audit.trail").handler(
  async (input: { entityType: AuditEntityType; entityId: string }, ctx) => {
    const rows = await ctx.audit.query({
      entityId: input.entityId,
      entityType: input.entityType,
    });

    return rows
      .map(normalize)
      .toSorted((left, right) => left.performedAt.getTime() - right.performedAt.getTime());
  },
);

export { getAuditTrail };
