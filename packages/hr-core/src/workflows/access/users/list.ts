import { hrUser } from "#/db-schemas";
import { HrUserFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

const InputSchema = object({
  filters: optional(HrUserFiltersSchema, {}),
});

export const listUsers = Workflow.name("hr.access.list-users")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters;
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(hrUser.employee_id, parsed.employeeId));
    }
    if (parsed.isActive !== undefined) {
      conditions.push(eq(hrUser.is_active, parsed.isActive));
    }
    if (parsed.userId) {
      conditions.push(eq(hrUser.user_id, parsed.userId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(hrUser).where(whereClause);
  });
