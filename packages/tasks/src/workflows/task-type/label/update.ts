import { IdSchema, UpdateLabelSchema } from "#/types";

import { masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateLabelSchema,
});

export const updateLabel = Workflow.name("task-type.update-label")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const updates: Record<string, string | null> = {};
    if (patch.color !== undefined) {
      updates.color = patch.color ?? null;
    }
    if (patch.name !== undefined) {
      updates.name = patch.name;
    }
    if (Object.keys(updates).length === 0) {
      const [current] = await ctx.db
        .select()
        .from(masterLabel)
        .where(eq(masterLabel.id, id))
        .limit(1);
      if (!current) {
        throw new Error(`Label "${id}" not found.`);
      }
      return current;
    }
    const [updated] = await ctx.db
      .update(masterLabel)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(masterLabel.id, id))
      .returning();

    return updated;
  });
