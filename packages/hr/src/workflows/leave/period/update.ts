import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { leavePeriod } from "../../../db-schemas";
import { UpdateLeavePeriodSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateLeavePeriodSchema,
});

export const updateLeavePeriod = Workflow.name("hr.leave.update-leave-period")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateLeavePeriodSchema, patch);

    const [updated] = await ctx.db
      .update(leavePeriod)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(leavePeriod.id, id))
      .returning();

    return updated;
  });
