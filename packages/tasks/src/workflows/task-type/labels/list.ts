import { label } from "#/db-schemas/label";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, optional } from "valibot";

export const listLabels = Workflow.name("task-type.list-labels")
  .input(object({ projectId: optional(IdSchema) }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions = projectId ? eq(label.projectId, projectId) : undefined;
      return ctx.db.select().from(label).where(conditions);
    }),
  );
