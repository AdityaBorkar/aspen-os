import { fetchObligationStep } from "#/workflow-steps/fetch-obligation";

import { Workflow } from "@aspen-os/platform/server";

const getObligationById = Workflow.name("obligation.get").handler(
  async (input: { id: string }, ctx) => ctx.step.run(fetchObligationStep, { id: input.id }),
);

export { getObligationById };
