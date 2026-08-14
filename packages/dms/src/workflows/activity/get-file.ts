import { Workflow } from "@aspen-os/platform/server";
import { integer, number, object, optional, pipe, string } from "valibot";

import { AUDIT_ENTITY_TYPE } from "../../utils/constants";
import { normalize, type AuditRow } from "./shared";

export const getFileActivity = Workflow.name("dms.activity.file")
  .input(
    object({
      fileId: string(),
      limit: optional(pipe(number(), integer()), 100),
      offset: optional(pipe(number(), integer()), 0),
    }),
  )
  .handler(async ({ fileId, limit, offset }, ctx) => {
    const rows = (await ctx.audit.query({
      entityId: fileId,
      entityType: AUDIT_ENTITY_TYPE.FILE,
      limit,
      offset,
    })) as unknown as AuditRow[];

    return rows.map(normalize);
  });
