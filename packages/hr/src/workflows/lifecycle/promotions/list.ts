import { employeePromotion } from "#/db-schemas";
import { PromotionFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const InputSchema = object({
  filters: optional(PromotionFiltersSchema),
});

export const listPromotions = Workflow.name("hr.lifecycle.list-promotions")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { filters } = input;

    const parsed = filters ? parse(PromotionFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.employeeId) {
      conditions.push(eq(employeePromotion.employeeId, parsed.employeeId));
    }
    if (parsed.status) {
      conditions.push(eq(employeePromotion.status, parsed.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db.select().from(employeePromotion).where(whereClause);
  });
