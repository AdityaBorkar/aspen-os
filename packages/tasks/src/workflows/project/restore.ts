import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { project } from "../../db-schemas/project";
import { IdSchema } from "../../types";
import { fetchProjectStep } from "../../workflow-steps/fetch-project";

export const restoreProject = Workflow.name("project.restore")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchProjectStep, { id });
    const [updated] = await ctx.db
      .update(project)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(project.id, id))
      .returning();
    return updated;
  });
