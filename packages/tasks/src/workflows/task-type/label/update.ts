import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { label } from "../../../db-schemas/label";
import { IdSchema, UpdateLabelSchema } from "../../../types";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateLabelSchema,
});

export const updateLabel = Workflow.name("task-type.update-label")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const [updated] = await ctx.db
      .update(label)
      .set({ color: patch.color, name: patch.name })
      .where(eq(label.id, id))
      .returning();

    return updated;
  });
