import { Workflow } from "@aspen-os/platform/server";
import { object, string } from "valibot";

import { fetchConnectionStep } from "./steps/fetch-connection";

export const getConnection = Workflow.name("connection.get")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => ctx.step.run(fetchConnectionStep, { id: input.id }));
