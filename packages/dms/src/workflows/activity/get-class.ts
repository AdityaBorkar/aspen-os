import { Workflow } from "@aspen-os/platform/server";
import { integer, number, object, optional, pipe, string } from "valibot";

import { AUDIT_ENTITY_TYPE } from "../../utils/constants";
import { normalize, type AuditRow } from "./shared";

export const getClassActivity = Workflow.name("dms.activity.class")
  .input(
    object({
      classId: string(),
      limit: optional(pipe(number(), integer()), 100),
      offset: optional(pipe(number(), integer()), 0),
    }),
  )
  .handler(async ({ classId, limit, offset }, ctx) => {
    const rows = (await ctx.audit.query({
      entityId: classId,
      entityType: AUDIT_ENTITY_TYPE.CLASS,
      limit,
      offset,
    })) as unknown as AuditRow[];

    return rows.map(normalize);
  });
