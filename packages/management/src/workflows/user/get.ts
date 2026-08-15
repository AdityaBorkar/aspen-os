import { IdSchema } from "#/types";
import { fetchUserStep } from "#/workflow-steps/fetch-user";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

export const getUser = Workflow.name("user.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => ctx.step.run(fetchUserStep, input));
