import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, optional, parse, string } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import {
  CreateShareSchema,
  DriveItemTypeSchema,
  UpdateShareSchema,
} from "../types";

const CreateInputSchema = object({ input: CreateShareSchema });
const ShareIdSchema = string();
const UpdateInputSchema = object({
  id: ShareIdSchema,
  input: UpdateShareSchema,
});
const WithShareIdSchema = object({ id: ShareIdSchema });
const ListSharesSchema = object({
  itemId: string(),
  itemType: DriveItemTypeSchema,
});
const ListSharedWithMeSchema = object({
  opts: optional(object({})),
  userId: string(),
});

export const createShare = Workflow.name("drive.share.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShareSchema, input);

    const [existing] = await ctx.db
      .select({ id: s.driveShare.id })
      .from(s.driveShare)
      .where(
        and(
          eq(s.driveShare.itemId, parsed.itemId),
          eq(s.driveShare.itemType, parsed.itemType),
          eq(s.driveShare.granteeId, parsed.granteeId),
          eq(s.driveShare.granteeType, parsed.granteeType),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error(
        "This item is already shared with the specified grantee.",
      );
    }

    const [share] = await ctx.db
      .insert(s.driveShare)
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

export const updateShare = Workflow.name("drive.share.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateShareSchema, input);

    const [updated] = await ctx.db
      .update(s.driveShare)
      .set({ permission: parsed.permission })
      .where(eq(s.driveShare.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    return updated;
  });

export const removeShare = Workflow.name("drive.share.remove")
  .input(WithShareIdSchema)
  .handler(async ({ id }, ctx) => {
    const [share] = await ctx.db
      .select({ id: s.driveShare.id, itemId: s.driveShare.itemId })
      .from(s.driveShare)
      .where(eq(s.driveShare.id, id))
      .limit(1);

    if (!share) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    await ctx.db.delete(s.driveShare).where(eq(s.driveShare.id, id));

    await ctx.pubsub.publish(DRIVE_EVENTS.UNSHARED, {
      itemId: share.itemId,
      shareId: id,
    });
  });

export const listShares = Workflow.name("drive.share.list")
  .input(ListSharesSchema)
  .handler(async ({ itemId, itemType }, ctx) => {
    return ctx.db
      .select()
      .from(s.driveShare)
      .where(
        and(
          eq(s.driveShare.itemId, itemId),
          eq(s.driveShare.itemType, itemType),
        ),
      );
  });

export const listSharedWithMe = Workflow.name("drive.share.list-shared-with-me")
  .input(ListSharedWithMeSchema)
  .handler(async ({ userId }, ctx) => {
    return ctx.db
      .select()
      .from(s.driveShare)
      .where(
        and(
          eq(s.driveShare.granteeId, userId),
          eq(s.driveShare.granteeType, "user"),
        ),
      )
      .limit(50)
      .offset(0);
  });

export const getShareById = Workflow.name("drive.share.get-by-id")
  .input(WithShareIdSchema)
  .handler(async ({ id }, ctx) => {
    const [share] = await ctx.db
      .select()
      .from(s.driveShare)
      .where(eq(s.driveShare.id, id))
      .limit(1);

    if (!share) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    return share;
  });

export const shares = {
  create: createShare,
  get: getShareById,
  list: listShares,
  listSharedWithMe,
  remove: removeShare,
  update: updateShare,
};
