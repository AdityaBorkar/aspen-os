import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { compensatoryLeaveRequest } from "../db-schemas";
import { CompensatoryLeaveFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(CompensatoryLeaveFiltersSchema),
});

export const listCompensatoryLeaves = Workflow.name(
  "hr.leave.list-compensatory-leaves",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters
      ? parse(CompensatoryLeaveFiltersSchema, filters)
      : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(
        eq(compensatoryLeaveRequest.employeeId, parsed.employeeId),
      );
    }
    if (parsed.status) {
      conditions.push(eq(compensatoryLeaveRequest.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(compensatoryLeaveRequest).where(whereClause);
  });
