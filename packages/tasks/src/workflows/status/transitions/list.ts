import { statusTransition } from "#/db-schemas/status-transition";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const listTransitions = Workflow.name("status.list-transitions")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(statusTransition).where(eq(statusTransition.projectId, projectId)),
    ),
  );
