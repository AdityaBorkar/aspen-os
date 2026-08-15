import { fetchRuleStep } from "#/workflow-steps/fetch-rule";

import { Workflow } from "@aspen-os/platform/server";

const getVerificationRuleById = Workflow.name("verification.get").handler(
  async (input: { id: string }, ctx) => ctx.step.run(fetchRuleStep, { id: input.id }),
);

export { getVerificationRuleById };
