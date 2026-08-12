import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { statusTransition } from "../db-schemas/status-transition";
import { IdSchema } from "../types";

export const listTransitions = Workflow.name("status.list-transitions")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) => {
    return ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(statusTransition)
        .where(eq(statusTransition.projectId, projectId));
    });
  });
