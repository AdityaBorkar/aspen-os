import { overtimeSlip } from "#/db-schemas";
import { UpdateOvertimeSlipSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateOvertimeSlipSchema,
});

export const updateOvertimeSlip = Workflow.name("hr.overtime.update-overtime-slip")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = patch;

    const [updated] = await ctx.db
      .update(overtimeSlip)
      .set({ ...parsed, updated_at: new Date() })
      .where(eq(overtimeSlip.id, id))
      .returning();

    return updated;
  });
