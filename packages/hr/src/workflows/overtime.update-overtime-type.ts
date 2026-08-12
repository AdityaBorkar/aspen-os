import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { minLength, object, parse, pipe, string } from "valibot";

import { overtimeType } from "../db-schemas";
import { UpdateOvertimeTypeSchema } from "../types";

const InputSchema = object({
  id: pipe(string(), minLength(1, "id is required")),
  patch: UpdateOvertimeTypeSchema,
});

export const updateOvertimeType = Workflow.name(
  "hr.overtime.update-overtime-type",
)
  .input(InputSchema)
  .handler(async (input, ctx) => {
    const { id, patch } = input;

    const parsed = parse(UpdateOvertimeTypeSchema, patch);

    const [updated] = await ctx.db
      .update(overtimeType)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(overtimeType.id, id))
      .returning();

    return updated;
  });
