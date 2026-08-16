import { IdSchema } from "#/types";
import { fetchChannelStep } from "#/workflow-steps/fetch-channel";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ input: object({ id: IdSchema }) });

export const getChannel = Workflow.name("comms.channel.get")
  .input(GetInputSchema)
  .handler(async ({ input }, ctx) => ctx.step.run(fetchChannelStep, { id: input.id }));
