import { IdSchema } from "#/types";
import { fetchMessageStep } from "#/workflow-steps/fetch-message";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ input: object({ id: IdSchema }) });

export const getMessage = Workflow.name("comms.message.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => ctx.step.run(fetchMessageStep, { id: input.id }));
