import { workspaceDashboard } from "#/db-schemas";
import { IdSchema } from "#/types";
import { fetchRowOrThrow } from "#/workflow-steps/fetch-row";

import { WorkflowStep } from "@aspen-os/platform/server";
import { object } from "valibot";

export const fetchDashboardStep = WorkflowStep.name("workspace-fetch-dashboard")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) =>
    fetchRowOrThrow(ctx.db, { id: input.id, label: "Dashboard", table: workspaceDashboard }),
  );
