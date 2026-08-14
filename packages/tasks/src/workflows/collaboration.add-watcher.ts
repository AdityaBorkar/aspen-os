import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { watcher } from "../db-schemas/watcher";
import { CreateWatcherSchema } from "../types";

const CreateInputSchema = object({
  input: CreateWatcherSchema,
});

export const addWatcher = Workflow.name("collaboration.add-watcher")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [existing] = await ctx.db
      .select({ id: watcher.id })
      .from(watcher)
      .where(and(eq(watcher.taskId, input.taskId), eq(watcher.userId, input.userId)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [result] = await ctx.db
      .insert(watcher)
      .values({
        taskId: input.taskId,
        userId: input.userId,
      })
      .returning();

    return result;
  });
