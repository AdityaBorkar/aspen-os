import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchUserStep } from "./steps/fetch-user";

export const getUser = Workflow.name("user.get")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    return ctx.step.run(fetchUserStep, input);
  });
