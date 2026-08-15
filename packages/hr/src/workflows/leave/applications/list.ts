import { leaveApplication } from "#/db-schemas";
import { LeaveApplicationFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(LeaveApplicationFiltersSchema),
});

export const listLeaveApplications = Workflow.name("hr.leave.list-leave-applications")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(LeaveApplicationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(leaveApplication.employeeId, parsed.employeeId));
    }
    if (parsed.leaveType) {
      conditions.push(eq(leaveApplication.leaveType, parsed.leaveType));
    }
    if (parsed.status) {
      conditions.push(eq(leaveApplication.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(leaveApplication).where(whereClause);
  });
