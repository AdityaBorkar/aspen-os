import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

import { employeeOnboarding } from "../../../db-schemas";
import { OnboardingFiltersSchema } from "../../../types";

const InputSchema = object({
  filters: optional(OnboardingFiltersSchema),
});

export const listOnboardings = Workflow.name("hr.lifecycle.list-onboardings")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(OnboardingFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeeOnboarding.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(employeeOnboarding.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(employeeOnboarding).where(whereClause);
  });
