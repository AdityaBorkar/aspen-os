import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { hrUser } from "../db-schemas";
import { HrUserFiltersSchema } from "../types";

const InputSchema = object({
  filters: optional(HrUserFiltersSchema),
});

export const listUsers = Workflow.name("hr.access.list-users")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(HrUserFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(hrUser.employeeId, parsed.employeeId));
    }
    if (parsed.isActive !== undefined) {
      conditions.push(eq(hrUser.isActive, parsed.isActive));
    }
    if (parsed.userId) {
      conditions.push(eq(hrUser.userId, parsed.userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(hrUser).where(whereClause);
  });
