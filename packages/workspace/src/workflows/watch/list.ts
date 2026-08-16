import { workspaceWatch } from "#/db-schemas";
import { ListWatchesSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListWatchesSchema });

export const listWatches = Workflow.name("workspace.watch.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(ListWatchesSchema, input);

    const conditions = [eq(workspaceWatch.userId, ctx.actorId)];
    if (parsed.itemType) {
      conditions.push(eq(workspaceWatch.itemType, parsed.itemType));
    }

    return ctx.db
      .select()
      .from(workspaceWatch)
      .where(and(...conditions))
      .orderBy(asc(workspaceWatch.createdAt));
  });
