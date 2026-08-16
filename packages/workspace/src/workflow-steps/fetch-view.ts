import { workspaceView } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchViewStep = WorkflowStep.name("workspace-fetch-view")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [view] = await ctx.db
      .select()
      .from(workspaceView)
      .where(eq(workspaceView.id, input.id))
      .limit(1);

    if (!view) {
      throw new Error(`View with id "${input.id}" not found.`);
    }
    return view;
  });
