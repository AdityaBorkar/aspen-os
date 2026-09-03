import { project } from "#/db-schemas/project";
import { IdSchema } from "#/types";
import { requireRow } from "#/workflows/utils";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchProjectStep = WorkflowStep.name("fetch-project")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const rows = await ctx.db.select().from(project).where(eq(project.id, input.id)).limit(1);

    return requireRow(rows, "Project", input.id);
  });
