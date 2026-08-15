import { AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { isAuditRow, normalize } from "#/workflows/activity/shared";

import { Workflow } from "@aspen-os/platform/server";
import { integer, number, object, optional, pipe, string } from "valibot";

export const getFileActivity = Workflow.name("dms.activity.file")
  .input(
    object({
      fileId: string(),
      limit: optional(pipe(number(), integer()), 100),
      offset: optional(pipe(number(), integer()), 0),
    }),
  )
  .handler(async ({ fileId, limit, offset }, ctx) => {
    const rows = await ctx.audit.query({
      entityId: fileId,
      entityType: AUDIT_ENTITY_TYPE.FILE,
      limit,
      offset,
    });

    return rows.filter(isAuditRow).map(normalize);
  });
