import { workspaceDashboard } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchDashboardStep = WorkflowStep.name("workspace-fetch-dashboard")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [dashboard] = await ctx.db
      .select()
      .from(workspaceDashboard)
      .where(eq(workspaceDashboard.id, input.id))
      .limit(1);

    if (!dashboard) {
      throw new Error(`Dashboard with id "${input.id}" not found.`);
    }
    return dashboard;
  });
