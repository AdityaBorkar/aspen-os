import { WithIdSchema } from "#/types";
import { fetchContactStep } from "#/workflow-steps/fetch-contact";

import { Workflow } from "@aspen-os/platform/server";

export const getContact = Workflow.name("masters.contact.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => ctx.step.run(fetchContactStep, { id: input.id }));
