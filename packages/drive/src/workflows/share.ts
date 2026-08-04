import type { PubSubUnit } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import type {
  CreateShareInput,
  ListSharedWithMeOptions,
  UpdateShareInput,
} from "../types";
import {
  CreateShareSchema,
  ListSharedWithMeOptionsSchema,
  UpdateShareSchema,
} from "../types";

type DB = NodePgDatabase<Record<string, never>>;

export interface ShareDeps {
  db: DB;
  pubsub: PubSubUnit;
}

export async function createShare(
  input: CreateShareInput,
  { db, pubsub }: ShareDeps,
) {
  const parsed = parse(CreateShareSchema, input);

  const [existing] = await db
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
    throw new Error("This item is already shared with the specified grantee.");
  }

  const [share] = await db
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

  await pubsub.publish(DRIVE_EVENTS.SHARED, {
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
}

export async function updateShare(
  { id, input }: { id: string; input: UpdateShareInput },
  { db }: ShareDeps,
) {
  const parsed = parse(UpdateShareSchema, input);

  const [updated] = await db
    .update(s.driveShare)
    .set({ permission: parsed.permission })
    .where(eq(s.driveShare.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Share with id "${id}" not found.`);
  }

  return updated;
}

export async function removeShare(
  { id }: { id: string },
  { db, pubsub }: ShareDeps,
) {
  const [share] = await db
    .select({ id: s.driveShare.id, itemId: s.driveShare.itemId })
    .from(s.driveShare)
    .where(eq(s.driveShare.id, id))
    .limit(1);

  if (!share) {
    throw new Error(`Share with id "${id}" not found.`);
  }

  await db.delete(s.driveShare).where(eq(s.driveShare.id, id));

  await pubsub.publish(DRIVE_EVENTS.UNSHARED, {
    itemId: share.itemId,
    shareId: id,
  });
}

export async function listShares(
  { itemId, itemType }: { itemId: string; itemType: "file" | "folder" },
  { db }: ShareDeps,
) {
  return db
    .select()
    .from(s.driveShare)
    .where(
      and(eq(s.driveShare.itemId, itemId), eq(s.driveShare.itemType, itemType)),
    );
}

export async function listSharedWithMe(
  { userId, opts }: { userId: string; opts?: ListSharedWithMeOptions },
  { db }: ShareDeps,
) {
  const parsed = parse(ListSharedWithMeOptionsSchema, opts ?? {});

  return db
    .select()
    .from(s.driveShare)
    .where(
      and(
        eq(s.driveShare.granteeId, userId),
        eq(s.driveShare.granteeType, "user"),
      ),
    )
    .limit(parsed.limit ?? 50)
    .offset(parsed.offset ?? 0);
}

export async function getShareById({ id }: { id: string }, { db }: ShareDeps) {
  const [share] = await db
    .select()
    .from(s.driveShare)
    .where(eq(s.driveShare.id, id))
    .limit(1);

  if (!share) {
    throw new Error(`Share with id "${id}" not found.`);
  }

  return share;
}
