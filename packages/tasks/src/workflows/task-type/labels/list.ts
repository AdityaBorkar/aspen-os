import { IdSchema } from "#/types";

import { masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional } from "valibot";

export const listLabels = Workflow.name("task-type.list-labels")
  .input(object({ projectId: optional(IdSchema) }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () => {
      if (projectId) {
        return ctx.db
          .select()
          .from(masterLabel)
          .where(and(eq(masterLabel.scope_type, "project"), eq(masterLabel.scope_id, projectId)));
      }
      // No project filter: return global + all project labels? For backwards compat, return all.
      // Filter to include global labels as well; but previous behavior returned all when no projectId.
      return ctx.db.select().from(masterLabel);
    }),
  );
