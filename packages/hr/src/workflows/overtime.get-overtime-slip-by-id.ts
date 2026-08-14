import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { overtimeSlip } from "../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getOvertimeSlipById = Workflow.name("hr.overtime.get-overtime-slip-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(overtimeSlip)
      .where(eq(overtimeSlip.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Overtime slip with id "${id}" not found.`);
    }

    return result;
  });
