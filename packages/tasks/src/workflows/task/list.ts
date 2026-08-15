import { task } from "#/db-schemas/task";
import { TaskFiltersSchema } from "#/types";
import { buildTaskWhereClause } from "#/utils/filter-engine";

import { Workflow } from "@aspen-os/platform/server";
import { desc } from "drizzle-orm";
import { object, optional } from "valibot";

export const listTasks = Workflow.name("task.list")
  .input(object({ filters: optional(TaskFiltersSchema) }))
  .handler(async ({ filters }, ctx) =>
    ctx.step.run("query", async () => {
      const whereClause = buildTaskWhereClause(filters);
      return ctx.db.select().from(task).where(whereClause).orderBy(desc(task.createdAt));
    }),
  );
