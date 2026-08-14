import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { employeeTransfer } from "../../../db-schemas";
import { UpdateTransferSchema } from "../../../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateTransferSchema,
});

export const updateTransfer = Workflow.name("hr.lifecycle.update-transfer")
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateTransferSchema, patch);

    const [updated] = await ctx.db
      .update(employeeTransfer)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(employeeTransfer.id, id))
      .returning();

    return updated;
  });
