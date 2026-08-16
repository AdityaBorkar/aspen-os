import { workspaceRecent } from "#/db-schemas";
import { ListRecentSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListRecentSchema });

export const listRecent = Workflow.name("workspace.recent.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(ListRecentSchema, input);

    const conditions = [eq(workspaceRecent.userId, ctx.actorId)];
    if (parsed.itemType) {
      conditions.push(eq(workspaceRecent.itemType, parsed.itemType));
    }

    return ctx.db
      .select()
      .from(workspaceRecent)
      .where(and(...conditions))
      .orderBy(desc(workspaceRecent.lastAccessedAt))
      .limit(parsed.limit ?? 50);
  });
