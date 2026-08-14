import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../../types";
import { fetchTimeEntryStep } from "../../workflow-steps/fetch-time-entry";

export const getTimeEntry = Workflow.name("time-entry.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => ctx.step.run(fetchTimeEntryStep, { id }));
