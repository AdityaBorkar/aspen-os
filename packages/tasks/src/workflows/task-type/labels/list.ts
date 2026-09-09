import { IdSchema } from "#/types";

import { masterLabel } from "@aspen-os/masters";
import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
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
      return ctx.db
        .select()
        .from(masterLabel)
        .where(and(isNull(masterLabel.scope_type), isNull(masterLabel.scope_id)));
    }),
  );
