import { IdSchema } from "#/schemas";
import { fetchReorderRuleStep } from "#/workflow-steps/fetch-reorder-rule";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const GetInputSchema = object({ id: IdSchema });

export const getReorderRule = Workflow.name("products.reorder-rule.get")
  .input(GetInputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchReorderRuleStep, { id }));
