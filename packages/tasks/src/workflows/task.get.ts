import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

import { IdSchema } from "../types";
import { fetchTaskStep } from "./steps/fetch-task";

export const getTask = Workflow.name("task.get")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    return ctx.step.run(fetchTaskStep, { id });
  });
