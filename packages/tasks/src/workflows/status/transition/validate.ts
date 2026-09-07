import { statusTransition } from "#/db-schemas/status-transition";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

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

      // Projects with no configured transitions allow every transition.
      // Once at least one transition exists, only configured ones are allowed.
      if (transition) {
        return true;
      }

      const configuredTransitions = await ctx.db
        .select({ id: statusTransition.id })
        .from(statusTransition)
        .where(eq(statusTransition.projectId, projectId))
        .limit(1);

      return configuredTransitions.length === 0;
    }),
  );
