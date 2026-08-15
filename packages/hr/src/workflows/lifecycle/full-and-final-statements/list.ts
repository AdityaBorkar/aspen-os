import { fullAndFinalStatement } from "#/db-schemas";
import { FullAndFinalFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(FullAndFinalFiltersSchema),
});

export const listFullAndFinalStatements = Workflow.name(
  "hr.lifecycle.list-full-and-final-statements",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(FullAndFinalFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(fullAndFinalStatement.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(fullAndFinalStatement.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(fullAndFinalStatement).where(whereClause);
  });
