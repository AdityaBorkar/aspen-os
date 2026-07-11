import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  driveAccessLog,
  driveFile,
  driveFolder,
  driveShare,
} from "../db-schema";
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

export class AccessService {
  constructor(private db: DB) {}

  async checkPermission(
    itemId: string,
    itemType: "file" | "folder",
    userId: string,
    required: DrivePermission,
  ): Promise<boolean> {
    const isOwner = await this.isOwner(itemId, itemType, userId);
    if (isOwner) return true;

    const permission = await this.getEffectivePermission(
      itemId,
      itemType,
      userId,
    );
    if (!permission) return false;

    return PERMISSION_RANK[permission] >= PERMISSION_RANK[required];
  }

  async isOwner(
    itemId: string,
    itemType: "file" | "folder",
    userId: string,
  ): Promise<boolean> {
    if (itemType === "folder") {
      const [folder] = await this.db
        .select({ ownerId: driveFolder.ownerId })
        .from(driveFolder)
        .where(eq(driveFolder.id, itemId))
        .limit(1);
      return folder?.ownerId === userId;
    }

    const [file] = await this.db
      .select({ ownerId: driveFile.ownerId })
      .from(driveFile)
      .where(eq(driveFile.id, itemId))
      .limit(1);
    return file?.ownerId === userId;
  }

  async getEffectivePermission(
    itemId: string,
    itemType: "file" | "folder",
    userId: string,
  ): Promise<DrivePermission | null> {
    const [directShare] = await this.db
      .select()
      .from(driveShare)
      .where(
        and(
          eq(driveShare.itemId, itemId),
          eq(driveShare.itemType, itemType),
          eq(driveShare.granteeId, userId),
          eq(driveShare.granteeType, "user"),
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
      const [file] = await this.db
        .select({ folderId: driveFile.folderId })
        .from(driveFile)
        .where(eq(driveFile.id, itemId))
        .limit(1);

      if (file?.folderId) {
        return this.getInheritedPermission(file.folderId, userId);
      }
    } else {
      const [folder] = await this.db
        .select({ parentId: driveFolder.parentId })
        .from(driveFolder)
        .where(eq(driveFolder.id, itemId))
        .limit(1);

      if (folder?.parentId) {
        return this.getInheritedPermission(folder.parentId, userId);
      }
    }

    return null;
  }

  async logAccess(input: AccessLogInput): Promise<void> {
    await this.db.insert(driveAccessLog).values({
      accessedBy: input.accessedBy ?? null,
      action: input.action,
      ip: input.ip ?? null,
      itemId: input.itemId,
      itemType: input.itemType,
      publicLinkId: input.publicLinkId ?? null,
      userAgent: input.userAgent ?? null,
    });
  }

  private async getInheritedPermission(
    folderId: string,
    userId: string,
  ): Promise<DrivePermission | null> {
    let currentId: string | null = folderId;
    let bestPermission: DrivePermission | null = null;

    while (currentId !== null) {
      const [share] = await this.db
        .select()
        .from(driveShare)
        .where(
          and(
            eq(driveShare.itemId, currentId),
            eq(driveShare.itemType, "folder"),
            eq(driveShare.granteeId, userId),
            eq(driveShare.granteeType, "user"),
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

      const [folder] = await this.db
        .select({ parentId: driveFolder.parentId })
        .from(driveFolder)
        .where(eq(driveFolder.id, currentId))
        .limit(1);

      currentId = folder?.parentId ?? null;
    }

    return bestPermission;
  }
}
