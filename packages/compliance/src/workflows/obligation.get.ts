import { Workflow } from "@aspen-os/platform/server";

import { fetchObligationStep } from "./steps/fetch-obligation";

const getObligationById = Workflow.name("obligation.get").handler(
  async (input: { id: string }, ctx) => {
    return ctx.step.run(fetchObligationStep, { id: input.id });
  },
);

export { getObligationById };
