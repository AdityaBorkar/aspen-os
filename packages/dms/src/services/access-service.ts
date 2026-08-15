import * as schemas from "#/db-schemas";
import type { SharePermission } from "#/types";

import { getContext } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

type DB = NodePgDatabase;

const PERMISSION_RANK: Record<SharePermission, number> = {
  editor: 2,
  owner: 3,
  viewer: 1,
};

export interface AccessLogInput {
  accessedBy?: string | null;
  action: string;
  entityId: string;
  entityType: "file" | "folder";
  ip?: string | null;
  publicLinkId?: string | null;
  userAgent?: string | null;
}

export async function checkPermission({
  entityId,
  entityType,
  required,
  userId,
}: {
  entityId: string;
  entityType: "file" | "folder";
  userId: string;
  required: SharePermission;
}): Promise<boolean> {
  const owner = await isOwner({ entityId, entityType, userId });
  if (owner) {
    return true;
  }

  const permission = await getEffectivePermission({ entityId, entityType, userId });
  if (!permission) {
    return false;
  }

  return PERMISSION_RANK[permission] >= PERMISSION_RANK[required];
}

export async function isOwner({
  entityId,
  entityType,
  userId,
}: {
  entityId: string;
  entityType: "file" | "folder";
  userId: string;
}): Promise<boolean> {
  const { db } = getContext();
  if (entityType === "folder") {
    const [folder] = await db
      .select({ ownerId: schemas.dmsFolder.ownerId })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, entityId))
      .limit(1);
    return folder?.ownerId === userId;
  }

  const [file] = await db
    .select({ ownerId: schemas.dmsFile.ownerId })
    .from(schemas.dmsFile)
    .where(eq(schemas.dmsFile.id, entityId))
    .limit(1);
  return file?.ownerId === userId;
}

export async function getEffectivePermission({
  entityId,
  entityType,
  userId,
}: {
  entityId: string;
  entityType: "file" | "folder";
  userId: string;
}): Promise<SharePermission | null> {
  const { db } = getContext();
  const [directShare] = await db
    .select()
    .from(schemas.dmsShare)
    .where(
      and(
        eq(schemas.dmsShare.entityId, entityId),
        eq(schemas.dmsShare.entityType, entityType),
        eq(schemas.dmsShare.granteeId, userId),
        eq(schemas.dmsShare.granteeType, "user"),
      ),
    )
    .limit(1);

  if (directShare) {
    if (directShare.expiresAt && directShare.expiresAt < new Date()) {
      return null;
    }
    return directShare.permission;
  }

  if (entityType === "file") {
    const [file] = await db
      .select({ folderId: schemas.dmsFile.folderId })
      .from(schemas.dmsFile)
      .where(eq(schemas.dmsFile.id, entityId))
      .limit(1);

    if (file?.folderId) {
      return getInheritedPermission({ folderId: file.folderId, userId });
    }
  } else {
    const [folder] = await db
      .select({ parentId: schemas.dmsFolder.parentId })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, entityId))
      .limit(1);

    if (folder?.parentId) {
      return getInheritedPermission({ folderId: folder.parentId, userId });
    }
  }

  return null;
}

export async function logAccess(input: AccessLogInput, db?: DB): Promise<void> {
  const target = db ?? getContext().db;
  await target.insert(schemas.dmsAccessLog).values({
    accessedBy: input.accessedBy ?? null,
    action: input.action,
    entityId: input.entityId,
    entityType: input.entityType,
    ip: input.ip ?? null,
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
}): Promise<SharePermission | null> {
  const { db } = getContext();
  let currentId: string | null = folderId;
  let bestPermission: SharePermission | null = null;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    const [share] = await db
      .select()
      .from(schemas.dmsShare)
      .where(
        and(
          eq(schemas.dmsShare.entityId, currentId),
          eq(schemas.dmsShare.entityType, "folder"),
          eq(schemas.dmsShare.granteeId, userId),
          eq(schemas.dmsShare.granteeType, "user"),
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
      .select({ parentId: schemas.dmsFolder.parentId })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, currentId))
      .limit(1);

    currentId = folder?.parentId ?? null;
  }
  // oxlint-enable eslint/no-await-in-loop

  return bestPermission;
}
