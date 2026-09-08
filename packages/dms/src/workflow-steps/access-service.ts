import * as schemas from "#/db-schemas";
import type { DmsFolder, SharePermission } from "#/types";

import { getContext } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

type DB = PostgresJsDatabase;

const MAX_INHERIT_DEPTH = 50;

const PERMISSION_RANK = {
  editor: 2,
  owner: 3,
  viewer: 1,
};

const OWNER_TABLES = {
  file: schemas.dmsFile,
  folder: schemas.dmsFolder,
} as const;

export interface AccessLogInput {
  accessedBy?: string | null;
  action: string;
  entityId: string;
  entityType: "file" | "folder";
  ip?: string | null;
  publicLinkId?: string | null;
  userAgent?: string | null;
}

export async function checkPermission(
  {
    entityId,
    entityType,
    required,
    userId,
  }: {
    entityId: string;
    entityType: "file" | "folder";
    userId: string;
    required: SharePermission;
  },
  db?: DB,
): Promise<boolean> {
  const target = db ?? getContext().db;
  const owner = await isOwner({ entityId, entityType, userId }, target);
  if (owner) {
    return true;
  }

  const permission = await getEffectivePermission({ entityId, entityType, userId }, target);
  if (!permission) {
    return false;
  }

  return PERMISSION_RANK[permission] >= PERMISSION_RANK[required];
}

export async function isOwner(
  {
    entityId,
    entityType,
    userId,
  }: {
    entityId: string;
    entityType: "file" | "folder";
    userId: string;
  },
  db?: DB,
): Promise<boolean> {
  const target = db ?? getContext().db;
  const table = OWNER_TABLES[entityType];
  const [row] = await target
    .select({ ownerId: table.owner_id })
    .from(table)
    .where(eq(table.id, entityId))
    .limit(1);
  return row?.ownerId === userId;
}

export async function getEffectivePermission(
  {
    entityId,
    entityType,
    userId,
  }: {
    entityId: string;
    entityType: "file" | "folder";
    userId: string;
  },
  db?: DB,
): Promise<SharePermission | null> {
  const target = db ?? getContext().db;
  const now = new Date();
  const directShare = await findDirectShare(target, entityId, entityType, userId);

  if (directShare) {
    if (directShare.expires_at && directShare.expires_at < now) {
      return null;
    }
    return directShare.permission;
  }

  if (entityType === "file") {
    const [file] = await target
      .select({ folderId: schemas.dmsFile.folder_id })
      .from(schemas.dmsFile)
      .where(eq(schemas.dmsFile.id, entityId))
      .limit(1);

    if (file?.folderId) {
      return getInheritedPermission({ folderId: file.folderId, userId }, target);
    }
  } else {
    const [folder] = await target
      .select({ parentId: schemas.dmsFolder.parent_id })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, entityId))
      .limit(1);

    if (folder?.parentId) {
      return getInheritedPermission({ folderId: folder.parentId, userId }, target);
    }
  }

  return null;
}

export async function logAccess(input: AccessLogInput, db?: DB): Promise<void> {
  const target = db ?? getContext().db;
  await target.insert(schemas.dmsAccessLog).values({
    accessed_by: input.accessedBy ?? null,
    action: input.action,
    entity_id: input.entityId,
    entity_type: input.entityType,
    ip: input.ip ?? null,
    public_link_id: input.publicLinkId ?? null,
    user_agent: input.userAgent ?? null,
  });
}

async function findDirectShare(
  db: DB,
  entityId: string,
  entityType: "file" | "folder",
  userId: string,
): Promise<typeof schemas.dmsShare.$inferSelect | null> {
  const [share] = await db
    .select()
    .from(schemas.dmsShare)
    .where(
      and(
        eq(schemas.dmsShare.entity_id, entityId),
        eq(schemas.dmsShare.entity_type, entityType),
        eq(schemas.dmsShare.grantee_id, userId),
        eq(schemas.dmsShare.grantee_type, "user"),
      ),
    )
    .limit(1);
  return share ?? null;
}

async function getInheritedPermission(
  {
    folderId,
    userId,
  }: {
    folderId: string;
    userId: string;
  },
  db?: DB,
): Promise<SharePermission | null> {
  const target = db ?? getContext().db;
  const now = new Date();
  let currentId: string | null = folderId;
  let bestPermission: SharePermission | null = null;
  const visited = new Set<string>();
  let depth = 0;

  // oxlint-disable eslint/no-await-in-loop
  while (currentId !== null) {
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);
    if (depth >= MAX_INHERIT_DEPTH) {
      break;
    }
    depth++;

    const share = await findDirectShare(target, currentId, "folder", userId);
    if (share) {
      if (!share.expires_at || share.expires_at >= now) {
        if (
          !bestPermission ||
          PERMISSION_RANK[share.permission] > PERMISSION_RANK[bestPermission]
        ) {
          bestPermission = share.permission;
        }
      }
    }

    const [folder]: { parentId: DmsFolder["parent_id"] }[] = await target
      .select({ parentId: schemas.dmsFolder.parent_id })
      .from(schemas.dmsFolder)
      .where(eq(schemas.dmsFolder.id, currentId))
      .limit(1);

    currentId = folder?.parentId ?? null;
  }
  // oxlint-enable eslint/no-await-in-loop

  return bestPermission;
}
