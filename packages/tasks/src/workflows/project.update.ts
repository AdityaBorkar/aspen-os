import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { project } from "../db-schemas/project";
import { IdSchema, UpdateProjectSchema } from "../types";
import { fetchProjectStep } from "../workflow-steps/fetch-project";
import { ensureKeyUnique } from "./utils";

const UpdateInputSchema = object({
  id: IdSchema,
  patch: UpdateProjectSchema,
});

export const updateProject = Workflow.name("project.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    await ctx.step.run(fetchProjectStep, { id });

    if (patch.key) {
      await ensureKeyUnique(ctx.db, patch.key, id);
    }

    const [updated] = await ctx.db
      .update(project)
      .set({
        defaultTaskTypeId: patch.defaultTaskTypeId,
        description: patch.description,
        key: patch.key,
        leadId: patch.leadId,
        name: patch.name,
        startDate: patch.startDate,
        status: patch.status,
        targetDate: patch.targetDate,
        updatedAt: new Date(),
      })
      .where(eq(project.id, id))
      .returning();

    return updated;
  });
