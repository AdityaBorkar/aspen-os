import { workspaceRecent } from "#/db-schemas";
import { getWorkspaceConfig } from "#/runtime";
import { resolveActorId } from "#/services/access-service";
import { TouchRecentSchema } from "#/types";
import { AUDIT_ACTION } from "#/utils/constants";
import { auditEntityType } from "#/workflows/pin/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { object, parse } from "valibot";

const TouchInputSchema = object({ input: TouchRecentSchema });

export const touchRecent = Workflow.name("workspace.recent.touch")
  .input(TouchInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(TouchRecentSchema, input);
    const userId = resolveActorId(ctx.actorId);
    const now = new Date();

    const existing = await ctx.db
      .select({ id: workspaceRecent.id })
      .from(workspaceRecent)
      .where(
        and(
          eq(workspaceRecent.userId, userId),
          eq(workspaceRecent.itemType, parsed.itemType),
          eq(workspaceRecent.itemId, parsed.itemId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const [updated] = await ctx.db
        .update(workspaceRecent)
        .set({ lastAccessedAt: now })
        .where(eq(workspaceRecent.id, existing[0].id))
        .returning();
      return updated ?? existing[0];
    }

    const [recent] = await ctx.db
      .insert(workspaceRecent)
      .values({ itemId: parsed.itemId, itemType: parsed.itemType, userId })
      .returning();

    if (!recent) {
      throw new Error("Failed to touch recent item.");
    }

    await ctx.step.run("trim-recent", async () => {
      const rows = await ctx.db
        .select({ id: workspaceRecent.id })
        .from(workspaceRecent)
        .where(eq(workspaceRecent.userId, userId))
        .orderBy(desc(workspaceRecent.lastAccessedAt));

      const max = getWorkspaceConfig().maxRecentItems;
      const toDelete = rows.slice(max).map((row) => row.id);
      if (toDelete.length > 0) {
        await ctx.db.delete(workspaceRecent).where(inArray(workspaceRecent.id, toDelete));
      }
    });

    await ctx.audit.write({
      action: AUDIT_ACTION.TOUCHED,
      crudAction: "create",
      entityId: parsed.itemId,
      entityType: auditEntityType(parsed.itemType),
      metadata: { itemType: parsed.itemType },
    });

    return recent;
  });
