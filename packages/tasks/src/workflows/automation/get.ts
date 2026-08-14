import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../../types";
import { fetchAutomationRuleStep } from "../../workflow-steps/fetch-automation-rule";

export const getAutomationRule = Workflow.name("automation.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => ctx.step.run(fetchAutomationRuleStep, { id }));
