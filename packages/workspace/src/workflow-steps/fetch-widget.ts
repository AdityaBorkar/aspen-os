import { workspaceWidget } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchWidgetStep = WorkflowStep.name("workspace-fetch-widget")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [widget] = await ctx.db
      .select()
      .from(workspaceWidget)
      .where(eq(workspaceWidget.id, input.id))
      .limit(1);

    if (!widget) {
      throw new Error(`Widget with id "${input.id}" not found.`);
    }
    return widget;
  });
