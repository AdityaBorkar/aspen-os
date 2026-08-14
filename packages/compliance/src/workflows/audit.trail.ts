import { Workflow } from "@aspen-os/platform/server";

import type { AuditEntityType } from "../utils/constants";
import { type AuditLogRow, normalize } from "./utils";

const getAuditTrail = Workflow.name("audit.trail").handler(
  async (input: { entityType: AuditEntityType; entityId: string }, ctx) => {
    const rows = (await ctx.audit.query({
      entityId: input.entityId,
      entityType: input.entityType,
    })) as AuditLogRow[];

    return rows
      .map(normalize)
      .sort((left, right) => left.performedAt.getTime() - right.performedAt.getTime());
  },
);

export { getAuditTrail };
