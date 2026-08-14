import { Workflow } from "@aspen-os/platform/server";

import { fetchRuleStep } from "./steps/fetch-rule";

const getVerificationRuleById = Workflow.name("verification.get").handler(
  async (input: { id: string }, ctx) => ctx.step.run(fetchRuleStep, { id: input.id }),
);

export { getVerificationRuleById };
