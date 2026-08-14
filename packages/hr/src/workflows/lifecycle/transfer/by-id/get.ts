import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeTransfer } from "../../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const getTransferById = Workflow.name("hr.lifecycle.get-transfer-by-id")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [result] = await ctx.db
      .select()
      .from(employeeTransfer)
      .where(eq(employeeTransfer.id, id))
      .limit(1);

    if (!result) {
      throw new Error(`Transfer with id "${id}" not found.`);
    }

    return result;
  });
