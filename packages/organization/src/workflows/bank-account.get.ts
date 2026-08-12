import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

import { fetchBankAccountStep } from "./steps/fetch-bank-account";

export const getBankAccount = Workflow.name("bank-account.get")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    return ctx.step.run(fetchBankAccountStep, { id: input.id });
  });
