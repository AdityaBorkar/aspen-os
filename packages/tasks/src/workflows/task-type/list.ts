import { taskType } from "#/db-schemas/task-type";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, optional } from "valibot";

export const listTaskTypes = Workflow.name("task-type.list")
  .input(object({ projectId: optional(IdSchema) }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () => {
      const conditions = projectId ? eq(taskType.projectId, projectId) : undefined;
      return ctx.db.select().from(taskType).where(conditions);
    }),
  );
