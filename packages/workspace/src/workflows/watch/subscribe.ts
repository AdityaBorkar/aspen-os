import { workspaceWatch } from "#/db-schemas";
import { WATCH_EVENTS } from "#/pubsub";
import { SubscribeWatchSchema } from "#/types";
import { AUDIT_ACTION } from "#/utils/constants";
import { resolveActorId } from "#/workflow-steps/access-service";
import { auditEntityType } from "#/workflows/pin/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const SubscribeInputSchema = object({ input: SubscribeWatchSchema });

export const subscribeWatch = Workflow.name("workspace.watch.subscribe")
  .input(SubscribeInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SubscribeWatchSchema, input);
    const userId = resolveActorId(ctx.actorId);

    const existing = await ctx.db
      .select({ id: workspaceWatch.id })
      .from(workspaceWatch)
      .where(
        and(
          eq(workspaceWatch.user_id, userId),
          eq(workspaceWatch.item_type, parsed.itemType),
          eq(workspaceWatch.item_id, parsed.itemId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const [watch] = await ctx.db
      .insert(workspaceWatch)
      .values({ item_id: parsed.itemId, item_type: parsed.itemType, user_id: userId })
      .returning();

    if (!watch) {
      throw new Error("Failed to subscribe to watch.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.WATCH_SUBSCRIBED,
      crudAction: "create",
      entityId: parsed.itemId,
      entityType: auditEntityType(parsed.itemType),
      metadata: { itemType: parsed.itemType },
    });

    await ctx.pubsub.publish(WATCH_EVENTS.SUBSCRIBED, {
      itemId: parsed.itemId,
      itemType: parsed.itemType,
      userId,
    });

    return watch;
  });
