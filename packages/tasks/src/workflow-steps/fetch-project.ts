import { project } from "#/db-schemas/project";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchProjectStep = WorkflowStep.name("fetch-project")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db.select().from(project).where(eq(project.id, input.id)).limit(1);

    if (!result) {
      throw new Error(`Project with id "${input.id}" not found.`);
    }

    return result;
  });
