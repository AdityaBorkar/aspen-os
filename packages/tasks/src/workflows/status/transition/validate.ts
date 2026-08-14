import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { statusTransition } from "../../../db-schemas/status-transition";
import { IdSchema } from "../../../types";

export const validateTransition = Workflow.name("status.validate-transition")
  .input(
    object({
      fromStatusId: IdSchema,
      projectId: IdSchema,
      toStatusId: IdSchema,
    }),
  )
  .handler(async ({ fromStatusId, toStatusId, projectId }, ctx) =>
    ctx.step.run("query", async () => {
      const [transition] = await ctx.db
        .select({ id: statusTransition.id })
        .from(statusTransition)
        .where(
          and(
            eq(statusTransition.fromStatusId, fromStatusId),
            eq(statusTransition.toStatusId, toStatusId),
            eq(statusTransition.projectId, projectId),
          ),
        )
        .limit(1);

      if (transition) {
        return true;
      }

      const anyTransition = await ctx.db
        .select({ id: statusTransition.id })
        .from(statusTransition)
        .where(eq(statusTransition.projectId, projectId))
        .limit(1);

      return anyTransition.length === 0;
    }),
  );
