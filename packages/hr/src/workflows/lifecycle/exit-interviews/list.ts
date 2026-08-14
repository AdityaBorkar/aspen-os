import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { exitInterview } from "../../../db-schemas";
import { ExitInterviewFiltersSchema } from "../../../types";

const InputSchema = object({
  filters: optional(ExitInterviewFiltersSchema),
});

export const listExitInterviews = Workflow.name("hr.lifecycle.list-exit-interviews")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(ExitInterviewFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(exitInterview.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(exitInterview.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(exitInterview).where(whereClause);
  });
