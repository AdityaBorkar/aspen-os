import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { status } from "../../db-schemas/status";
import { IdSchema, UpdateStatusSchema } from "../../types";
import { fetchStatusStep } from "../../workflow-steps/fetch-status";
import { unsetDefaultProjectStatus } from "../utils";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateStatusSchema,
});

export const updateStatus = Workflow.name("status.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    await ctx.step.run(fetchStatusStep, { id });

    if (patch.isDefault) {
      const [current] = await ctx.db
        .select({ projectId: status.projectId })
        .from(status)
        .where(eq(status.id, id))
        .limit(1);
      if (current) {
        await unsetDefaultProjectStatus(ctx.db, current.projectId);
      }
    }

    const [updated] = await ctx.db
      .update(status)
      .set({
        category: patch.category,
        color: patch.color,
        isDefault: patch.isDefault,
        isResolved: patch.isResolved,
        name: patch.name,
        sortOrder: patch.sortOrder,
      })
      .where(eq(status.id, id))
      .returning();

    return updated;
  });
