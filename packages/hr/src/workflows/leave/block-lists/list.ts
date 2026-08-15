import { leaveBlockList } from "#/db-schemas";
import { LeaveBlockListFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(LeaveBlockListFiltersSchema),
});

export const listLeaveBlockLists = Workflow.name("hr.leave.list-leave-block-lists")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(LeaveBlockListFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.company) {
      conditions.push(eq(leaveBlockList.company, parsed.company));
    }
    if (parsed.department) {
      conditions.push(eq(leaveBlockList.department, parsed.department));
    }
    if (parsed.scope) {
      conditions.push(eq(leaveBlockList.scope, parsed.scope));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(leaveBlockList).where(whereClause);
  });
