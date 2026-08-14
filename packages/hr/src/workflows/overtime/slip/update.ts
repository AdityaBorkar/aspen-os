import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { overtimeSlip } from "../../../db-schemas";
import { UpdateOvertimeSlipSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateOvertimeSlipSchema,
});

export const updateOvertimeSlip = Workflow.name("hr.overtime.update-overtime-slip")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateOvertimeSlipSchema, patch);

    const [updated] = await ctx.db
      .update(overtimeSlip)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(overtimeSlip.id, id))
      .returning();

    return updated;
  });
