import { WithIdSchema } from "#/types";
import { fetchPaymentMethodStep } from "#/workflow-steps/fetch-payment-method";

import { Workflow } from "@aspen-os/platform/server";

export const getPaymentMethod = Workflow.name("masters.payment-method.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => ctx.step.run(fetchPaymentMethodStep, { id: input.id }));
