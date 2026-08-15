import { WithIdSchema } from "#/types";
import { fetchAddressStep } from "#/workflow-steps/fetch-address";

import { Workflow } from "@aspen-os/platform/server";

export const getAddress = Workflow.name("masters.address.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => ctx.step.run(fetchAddressStep, { id: input.id }));
