import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsItemShare } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { CreateItemShareSchema } from "../types";

const CreateInputSchema = object({ input: CreateItemShareSchema });

export const createItemShare = Workflow.name("dms.item-share.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateItemShareSchema, input);

    const [existing] = await ctx.db
      .select({ id: dmsItemShare.id })
      .from(dmsItemShare)
      .where(
        and(
          eq(dmsItemShare.itemId, parsed.itemId),
          eq(dmsItemShare.itemType, parsed.itemType),
          eq(dmsItemShare.granteeId, parsed.granteeId),
          eq(dmsItemShare.granteeType, parsed.granteeType),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("This item is already shared with the specified grantee.");
    }

    const [share] = await ctx.db
      .insert(dmsItemShare)
      .values({
        expiresAt: parsed.expiresAt ?? null,
        granteeId: parsed.granteeId,
        granteeType: parsed.granteeType,
        itemId: parsed.itemId,
        itemType: parsed.itemType,
        message: parsed.message ?? null,
        permission: parsed.permission,
        sharedBy: parsed.sharedBy,
      })
      .returning();

    if (!share) {
      throw new Error("Failed to create share.");
    }

    await ctx.pubsub.publish(ITEM_EVENTS.SHARED, {
      share: {
        createdAt: share.createdAt.toISOString(),
        granteeId: share.granteeId,
        granteeType: share.granteeType,
        id: share.id,
        itemId: share.itemId,
        itemType: share.itemType,
        permission: share.permission,
        sharedBy: share.sharedBy,
      },
    });

    return share;
  });
