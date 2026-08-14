import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, pipe, string } from "valibot";

import { employeeTransfer } from "../../../db-schemas";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
});

export const deleteTransfer = Workflow.name("hr.lifecycle.delete-transfer")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id } = input;

    const [deleted] = await ctx.db
      .delete(employeeTransfer)
      .where(eq(employeeTransfer.id, id))
      .returning();

    return deleted;
  });
