import { workspaceRecent } from "#/db-schemas";
import { getWorkspaceConfig } from "#/runtime";
import { TouchRecentSchema } from "#/types";
import { AUDIT_ACTION } from "#/utils/constants";
import { resolveActorId } from "#/workflow-steps/access-service";
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
          eq(workspaceRecent.user_id, userId),
          eq(workspaceRecent.item_type, parsed.itemType),
          eq(workspaceRecent.item_id, parsed.itemId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const [updated] = await ctx.db
        .update(workspaceRecent)
        .set({ last_accessed_at: now })
        .where(eq(workspaceRecent.id, existing[0].id))
        .returning();
      return updated ?? existing[0];
    }

    const [recent] = await ctx.db
      .insert(workspaceRecent)
      .values({ item_id: parsed.itemId, item_type: parsed.itemType, user_id: userId })
      .returning();

    if (!recent) {
      throw new Error("Failed to touch recent item.");
    }

    await ctx.step.run("trim-recent", async () => {
      const rows = await ctx.db
        .select({ id: workspaceRecent.id })
        .from(workspaceRecent)
        .where(eq(workspaceRecent.user_id, userId))
        .orderBy(desc(workspaceRecent.last_accessed_at));

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
