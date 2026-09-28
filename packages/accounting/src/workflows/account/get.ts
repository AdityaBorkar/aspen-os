import { fetchAccountStep } from "#/workflow-steps/fetch-account";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const getAccount = Workflow.name("accounting.account.get")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => ctx.step.run(fetchAccountStep, { id }));
