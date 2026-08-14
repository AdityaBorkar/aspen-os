import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

import { fetchAddressStep } from "../../workflow-steps/fetch-address";

export const getAddress = Workflow.name("address.get")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => ctx.step.run(fetchAddressStep, { id: input.id }));
