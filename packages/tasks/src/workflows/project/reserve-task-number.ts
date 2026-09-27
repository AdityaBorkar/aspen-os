import { IdSchema } from "#/types";
import { generateTaskNumber } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

/**
 * Atomically increments `task_project.task_counter` and returns the next
 * display number (`KEY-SEQ`). Runs against the control plane. Split
 * deployments call this before `task.create` with a preassigned number,
 * because the tenant database cannot see `task_project`.
 */
export const reserveTaskNumber = Workflow.name("project.reserve-task-number")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) => generateTaskNumber(ctx.db, projectId));
