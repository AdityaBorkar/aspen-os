import { IdSchema } from "#/types";
import { fetchProviderStep } from "#/workflow-steps/fetch-provider";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ input: object({ id: IdSchema }) });

export const getProvider = Workflow.name("comms.provider.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => ctx.step.run(fetchProviderStep, { id: input.id }));
