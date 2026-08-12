import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchStatusStep } from "./steps/fetch-status";

export const getStatus = Workflow.name("status.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    return ctx.step.run(fetchStatusStep, { id });
  });
