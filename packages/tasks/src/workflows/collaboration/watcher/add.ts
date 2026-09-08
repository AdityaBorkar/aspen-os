import { watcher } from "#/db-schemas/watcher";
import { CreateWatcherSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

const CreateInputSchema = object({
  input: CreateWatcherSchema,
});

export const addWatcher = Workflow.name("collaboration.add-watcher")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [existing] = await ctx.db
      .select({ id: watcher.id })
      .from(watcher)
      .where(and(eq(watcher.task_id, input.taskId), eq(watcher.user_id, input.userId)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [result] = await ctx.db
      .insert(watcher)
      .values({
        task_id: input.taskId,
        user_id: input.userId,
      })
      .returning();

    return result;
  });
