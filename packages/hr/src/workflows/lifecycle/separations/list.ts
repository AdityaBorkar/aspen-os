import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { employeeSeparation } from "../../../db-schemas";
import { SeparationFiltersSchema } from "../../../types";

const InputSchema = object({
  filters: optional(SeparationFiltersSchema),
});

export const listSeparations = Workflow.name("hr.lifecycle.list-separations")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(SeparationFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeSeparation.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(employeeSeparation.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(employeeSeparation).where(whereClause);
  });
