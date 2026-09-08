import { status } from "#/db-schemas/status";
import { IdSchema, UpdateStatusSchema } from "#/types";
import { fetchStatusStep } from "#/workflow-steps/fetch-status";
import { unsetDefaultProjectStatus } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateStatusSchema,
});

export const updateStatus = Workflow.name("status.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const current = await ctx.step.run(fetchStatusStep, { id });

    if (patch.isDefault) {
      await unsetDefaultProjectStatus(ctx.db, current.project_id);
    }

    const [updated] = await ctx.db
      .update(status)
      .set({
        category: patch.category,
        color: patch.color,
        is_default: patch.isDefault,
        is_resolved: patch.isResolved,
        name: patch.name,
        sort_order: patch.sortOrder,
      })
      .where(eq(status.id, id))
      .returning();

    return updated;
  });
