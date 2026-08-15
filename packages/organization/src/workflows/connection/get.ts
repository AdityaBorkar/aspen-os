import { fetchConnectionStep } from "#/workflow-steps/fetch-connection";

import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

export const getConnection = Workflow.name("connection.get")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => ctx.step.run(fetchConnectionStep, { id: input.id }));
