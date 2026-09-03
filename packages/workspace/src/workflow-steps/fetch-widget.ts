import { workspaceWidget } from "#/db-schemas";
import { IdSchema } from "#/types";
import { fetchRowOrThrow } from "#/workflow-steps/fetch-row";

import { WorkflowStep } from "@aspen-os/platform/server";
import { object } from "valibot";

export const fetchWidgetStep = WorkflowStep.name("workspace-fetch-widget")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) =>
    fetchRowOrThrow(ctx.db, { id: input.id, label: "Widget", table: workspaceWidget }),
  );
