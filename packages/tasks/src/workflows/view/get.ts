import { IdSchema } from "#/types";
import { fetchSavedViewStep } from "#/workflow-steps/fetch-saved-view";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getSavedView = Workflow.name("view.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => ctx.step.run(fetchSavedViewStep, { id }));
