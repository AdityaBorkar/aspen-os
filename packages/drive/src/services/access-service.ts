import { getContext } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schemas from "../db-schemas";
import type { DrivePermission } from "../types";

type DB = NodePgDatabase<Record<string, never>>;

const PERMISSION_RANK: Record<DrivePermission, number> = {
  editor: 2,
  owner: 3,
  viewer: 1,
};

export interface AccessLogInput {
  accessedBy?: string | null;
  action: string;
  ip?: string | null;
  itemId: string;
  itemType: "file" | "folder";
  publicLinkId?: string | null;
  userAgent?: string | null;
}

export async function checkPermission({
  itemId,
  itemType,
  required,
  userId,
}: {
  itemId: string;
  itemType: "file" | "folder";
  userId: string;
  required: DrivePermission;
}): Promise<boolean> {
  const owner = await isOwner({ itemId, itemType, userId });
  if (owner) {
    return true;
  }

  const permission = await getEffectivePermission({ itemId, itemType, userId });
  if (!permission) {
    return false;
  }

  return PERMISSION_RANK[permission] >= PERMISSION_RANK[required];
}

export async function isOwner({
  itemId,
  itemType,
  userId,
}: {
  itemId: string;
  itemType: "file" | "folder";
  userId: string;
}): Promise<boolean> {
  const { db } = getContext();
  if (itemType === "folder") {
    const [folder] = await db
      .select({ ownerId: schemas.driveFolder.ownerId })
      .from(schemas.driveFolder)
      .where(eq(schemas.driveFolder.id, itemId))
      .limit(1);
    return folder?.ownerId === userId;
  }

  const [file] = await db
    .select({ ownerId: schemas.driveFile.ownerId })
    .from(schemas.driveFile)
    .where(eq(schemas.driveFile.id, itemId))
    .limit(1);
  return file?.ownerId === userId;
}

export async function getEffectivePermission({
  itemId,
  itemType,
  userId,
}: {
  itemId: string;
  itemType: "file" | "folder";
  userId: string;
}): Promise<DrivePermission | null> {
  const { db } = getContext();
  const [directShare] = await db
    .select()
    .from(schemas.driveShare)
    .where(
      and(
        eq(schemas.driveShare.itemId, itemId),
        eq(schemas.driveShare.itemType, itemType),
        eq(schemas.driveShare.granteeId, userId),
        eq(schemas.driveShare.granteeType, "user"),
      ),
    )
    .limit(1);

  if (directShare) {
    if (directShare.expiresAt && directShare.expiresAt < new Date()) {
      return null;
    }
    return directShare.permission;
  }

  if (itemType === "file") {
    const [file] = await db
      .select({ folderId: schemas.driveFile.folderId })
      .from(schemas.driveFile)
      .where(eq(schemas.driveFile.id, itemId))
      .limit(1);

    if (file?.folderId) {
      return getInheritedPermission({ folderId: file.folderId, userId });
    }
  } else {
    const [folder] = await db
      .select({ parentId: schemas.driveFolder.parentId })
      .from(schemas.driveFolder)
      .where(eq(schemas.driveFolder.id, itemId))
      .limit(1);

    if (folder?.parentId) {
      return getInheritedPermission({ folderId: folder.parentId, userId });
    }
  }

  return null;
}

export async function logAccess(input: AccessLogInput, db?: DB): Promise<void> {
  const target = db ?? getContext().db;
  await target.insert(schemas.driveAccessLog).values({
    accessedBy: input.accessedBy ?? null,
    action: input.action,
    ip: input.ip ?? null,
    itemId: input.itemId,
    itemType: input.itemType,
    publicLinkId: input.publicLinkId ?? null,
    userAgent: input.userAgent ?? null,
  });
}

async function getInheritedPermission({
  folderId,
  userId,
}: {
  folderId: string;
  userId: string;
}): Promise<DrivePermission | null> {
  const { db } = getContext();
  let currentId: string | null = folderId;
  let bestPermission: DrivePermission | null = null;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    const [share] = await db
      .select()
      .from(schemas.driveShare)
      .where(
        and(
          eq(schemas.driveShare.itemId, currentId),
          eq(schemas.driveShare.itemType, "folder"),
          eq(schemas.driveShare.granteeId, userId),
          eq(schemas.driveShare.granteeType, "user"),
        ),
      )
      .limit(1);

    if (share) {
      if (!share.expiresAt || share.expiresAt >= new Date()) {
        if (
          !bestPermission ||
          PERMISSION_RANK[share.permission] > PERMISSION_RANK[bestPermission]
        ) {
          bestPermission = share.permission;
        }
      }
    }

    const [folder] = await db
      .select({ parentId: schemas.driveFolder.parentId })
      .from(schemas.driveFolder)
      .where(eq(schemas.driveFolder.id, currentId))
      .limit(1);

    currentId = folder?.parentId ?? null;
  }
  // oxlint-enable eslint/no-await-in-loop

  return bestPermission;
}
