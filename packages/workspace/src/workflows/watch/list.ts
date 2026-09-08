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

    const conditions = [eq(workspaceWatch.user_id, ctx.actorId)];
    if (parsed.itemType) {
      conditions.push(eq(workspaceWatch.item_type, parsed.itemType));
    }

    return ctx.db
      .select()
      .from(workspaceWatch)
      .where(and(...conditions))
      .orderBy(asc(workspaceWatch.created_at));
  });
