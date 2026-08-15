import { WithIdSchema } from "#/types";
import { fetchConnectionStep } from "#/workflow-steps/fetch-connection";

import { Workflow } from "@aspen-os/platform/server";

export const getConnection = Workflow.name("masters.connection.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => ctx.step.run(fetchConnectionStep, { id: input.id }));
