import { WithIdSchema } from "#/types";
import { fetchBankAccountStep } from "#/workflow-steps/fetch-bank-account";

import { Workflow } from "@aspen-os/platform/server";

export const getBankAccount = Workflow.name("masters.bank-account.get")
  .input(WithIdSchema)
  .handler(async (input, ctx) => ctx.step.run(fetchBankAccountStep, { id: input.id }));
