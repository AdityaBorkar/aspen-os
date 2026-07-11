import type { PubSubUnit } from "@aspen-os/framework/server";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { driveShare } from "../db-schema";
import { DRIVE_EVENTS } from "../event-map";
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

export class ShareWorkflow {
  constructor(
    private db: DB,
    private pubsub: PubSubUnit,
  ) {}

  async create(input: CreateShareInput) {
    const parsed = parse(CreateShareSchema, input);

    const [existing] = await this.db
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

    const [share] = await this.db
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

    await this.pubsub.publish(DRIVE_EVENTS.SHARED, {
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

  async update(id: string, input: UpdateShareInput) {
    const parsed = parse(UpdateShareSchema, input);

    const [updated] = await this.db
      .update(driveShare)
      .set({ permission: parsed.permission })
      .where(eq(driveShare.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    return updated;
  }

  async remove(id: string) {
    const [share] = await this.db
      .select({ id: driveShare.id, itemId: driveShare.itemId })
      .from(driveShare)
      .where(eq(driveShare.id, id))
      .limit(1);

    if (!share) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    await this.db.delete(driveShare).where(eq(driveShare.id, id));

    await this.pubsub.publish(DRIVE_EVENTS.UNSHARED, {
      itemId: share.itemId,
      shareId: id,
    });
  }

  async list(itemId: string, itemType: "file" | "folder") {
    return this.db
      .select()
      .from(driveShare)
      .where(
        and(eq(driveShare.itemId, itemId), eq(driveShare.itemType, itemType)),
      );
  }

  async listSharedWithMe(userId: string, opts?: ListSharedWithMeOptions) {
    const parsed = parse(ListSharedWithMeOptionsSchema, opts ?? {});

    return this.db
      .select()
      .from(driveShare)
      .where(
        and(
          eq(driveShare.granteeId, userId),
          eq(driveShare.granteeType, "user"),
        ),
      )
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  }

  async getById(id: string) {
    const [share] = await this.db
      .select()
      .from(driveShare)
      .where(eq(driveShare.id, id))
      .limit(1);

    if (!share) {
      throw new Error(`Share with id "${id}" not found.`);
    }

    return share;
  }
}
