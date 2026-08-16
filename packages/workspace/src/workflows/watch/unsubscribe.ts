import { workspaceWatch } from "#/db-schemas";
import { WATCH_EVENTS } from "#/pubsub";
import { UnsubscribeWatchSchema } from "#/types";
import { AUDIT_ACTION } from "#/utils/constants";
import { auditEntityType } from "#/workflows/pin/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UnsubscribeInputSchema = object({ input: UnsubscribeWatchSchema });

export const unsubscribeWatch = Workflow.name("workspace.watch.unsubscribe")
  .input(UnsubscribeInputSchema)
  .handler(async ({ input }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }
    const parsed = parse(UnsubscribeWatchSchema, input);

    const [watch] = await ctx.db
      .select({ itemId: workspaceWatch.itemId, itemType: workspaceWatch.itemType })
      .from(workspaceWatch)
      .where(and(eq(workspaceWatch.id, parsed.id), eq(workspaceWatch.userId, ctx.actorId)))
      .limit(1);

    if (!watch) {
      throw new Error(`Watch "${parsed.id}" not found.`);
    }

    await ctx.db
      .delete(workspaceWatch)
      .where(and(eq(workspaceWatch.id, parsed.id), eq(workspaceWatch.userId, ctx.actorId)));

    await ctx.audit.write({
      action: AUDIT_ACTION.WATCH_UNSUBSCRIBED,
      crudAction: "delete",
      entityId: watch.itemId,
      entityType: auditEntityType(watch.itemType),
      metadata: { itemType: watch.itemType },
    });

    await ctx.pubsub.publish(WATCH_EVENTS.UNSUBSCRIBED, {
      itemId: watch.itemId,
      itemType: watch.itemType,
      userId: ctx.actorId,
    });

    return { id: parsed.id };
  });
