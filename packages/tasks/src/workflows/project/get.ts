import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../../types";
import { fetchProjectStep } from "../../workflow-steps/fetch-project";

export const getProject = Workflow.name("project.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => ctx.step.run(fetchProjectStep, { id }));
