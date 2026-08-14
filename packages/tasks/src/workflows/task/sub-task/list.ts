import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object } from "valibot";

import { task } from "../../../db-schemas/task";
import { IdSchema } from "../../../types";

export const getSubTasks = Workflow.name("task.sub-tasks")
  .input(object({ parentId: IdSchema }))
  .handler(async ({ parentId }, ctx) =>
    ctx.step.run("query", async () =>
      ctx.db.select().from(task).where(eq(task.parentId, parentId)).orderBy(desc(task.createdAt)),
    ),
  );
