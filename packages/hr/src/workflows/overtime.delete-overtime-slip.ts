import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { overtimeSlip } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteOvertimeSlip = Workflow.name("hr.overtime.delete-overtime-slip")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db.delete(overtimeSlip).where(eq(overtimeSlip.id, id)).returning();

    return deleted;
  });
