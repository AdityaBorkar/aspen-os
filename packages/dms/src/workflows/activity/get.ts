import { mapEntityType, normalize } from "#/workflows/activity/shared";
import type { AuditRow } from "#/workflows/activity/shared";

import { Workflow } from "@aspen-os/platform/server";
import { integer, number, object, optional, pipe, string } from "valibot";

const ActivityInputSchema = object({
  entityId: string(),
  entityType: optional(string(), "file"),
  limit: optional(pipe(number(), integer()), 100),
  offset: optional(pipe(number(), integer()), 0),
});

export const getActivity = Workflow.name("dms.activity.get")
  .input(ActivityInputSchema)
  .handler(async ({ entityId, entityType, limit, offset }, ctx) => {
    const rows = (await ctx.audit.query({
      entityId,
      entityType: mapEntityType(entityType),
      limit,
      offset,
    })) as unknown as AuditRow[];

    return rows.map(normalize);
  });
