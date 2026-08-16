import { WithIdSchema } from "#/types";
import { fetchEntityStep } from "#/workflow-steps/fetch-entity";

import { Workflow } from "@aspen-os/platform/server";

export const getEntity = Workflow.name("masters.entity.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => ctx.step.run(fetchEntityStep, { id: input.id }));
