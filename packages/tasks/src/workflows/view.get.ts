import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchSavedViewStep } from "./steps/fetch-saved-view";

export const getSavedView = Workflow.name("view.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    return ctx.step.run(fetchSavedViewStep, { id });
  });
