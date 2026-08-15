import { leaveEncashment } from "#/db-schemas";
import { LeaveEncashmentFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(LeaveEncashmentFiltersSchema),
});

export const listLeaveEncashments = Workflow.name("hr.leave.list-leave-encashments")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(LeaveEncashmentFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leaveEncashment.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(leaveEncashment.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(leaveEncashment).where(whereClause);
  });
