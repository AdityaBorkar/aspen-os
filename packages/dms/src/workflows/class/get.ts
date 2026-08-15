import { IdSchema } from "#/types";
import { fetchClassStep } from "#/workflow-steps/fetch-class";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getClass = Workflow.name("dms.class.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchClassStep, { id }));
