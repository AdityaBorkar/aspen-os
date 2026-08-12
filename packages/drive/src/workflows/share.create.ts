import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { driveShare } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { CreateShareSchema } from "../types";

const CreateInputSchema = object({ input: CreateShareSchema });

export const createShare = Workflow.name("drive.share.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShareSchema, input);

    const [existing] = await ctx.db
      .select({ id: driveShare.id })
      .from(driveShare)
      .where(
        and(
          eq(driveShare.itemId, parsed.itemId),
          eq(driveShare.itemType, parsed.itemType),
          eq(driveShare.granteeId, parsed.granteeId),
          eq(driveShare.granteeType, parsed.granteeType),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error(
        "This item is already shared with the specified grantee.",
      );
    }

    const [share] = await ctx.db
      .insert(driveShare)
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

    await ctx.pubsub.publish(DRIVE_EVENTS.SHARED, {
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
