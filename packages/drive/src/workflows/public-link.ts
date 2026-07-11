import type { PubSubUnit } from "@aspen-os/framework/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import { drivePublicLink } from "../db-schema";
import { DRIVE_EVENTS } from "../event-map";
import type { AccessService } from "../services/access-service";
import type {
  CreatePublicLinkInput,
  ResolvePublicLinkInput,
  UpdatePublicLinkInput,
} from "../types";
import {
  CreatePublicLinkSchema,
  ResolvePublicLinkSchema,
  UpdatePublicLinkSchema,
} from "../types";

type DB = NodePgDatabase<Record<string, never>>;

export interface ResolvedPublicLink {
  itemId: string;
  itemType: "file" | "folder";
  permission: "view" | "edit";
  publicLinkId: string;
}

export class PublicLinkWorkflow {
  constructor(
    private db: DB,
    private accessService: AccessService,
    private pubsub: PubSubUnit,
  ) {}

  async create(input: CreatePublicLinkInput) {
    const parsed = parse(CreatePublicLinkSchema, input);

    const token = this.generateToken();
    const hashedPassword = parsed.password
      ? await Bun.password.hash(parsed.password)
      : null;

    const [publicLink] = await this.db
      .insert(drivePublicLink)
      .values({
        createdBy: parsed.createdBy,
        expiresAt: parsed.expiresAt ?? null,
        itemId: parsed.itemId,
        itemType: parsed.itemType,
        maxViews: parsed.maxViews ?? null,
        password: hashedPassword,
        permission: parsed.permission,
        token,
      })
      .returning();

    if (!publicLink) {
      throw new Error("Failed to create public link.");
    }

    await this.pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_CREATED, {
      publicLink: {
        createdBy: publicLink.createdBy,
        id: publicLink.id,
        itemId: publicLink.itemId,
        itemType: publicLink.itemType,
        permission: publicLink.permission,
        token: publicLink.token,
      },
    });

    return publicLink;
  }

  async update(id: string, input: UpdatePublicLinkInput) {
    const parsed = parse(UpdatePublicLinkSchema, input);

    const updates: Record<string, unknown> = {};

    if (parsed.permission !== undefined) {
      updates.permission = parsed.permission;
    }
    if (parsed.expiresAt !== undefined) {
      updates.expiresAt = parsed.expiresAt;
    }
    if (parsed.isActive !== undefined) {
      updates.isActive = parsed.isActive;
    }
    if (parsed.maxViews !== undefined) {
      updates.maxViews = parsed.maxViews;
    }
    if (parsed.password !== undefined) {
      updates.password = parsed.password
        ? await Bun.password.hash(parsed.password)
        : null;
    }

    const [updated] = await this.db
      .update(drivePublicLink)
      .set(updates)
      .where(eq(drivePublicLink.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    return updated;
  }

  async revoke(id: string) {
    const [link] = await this.db
      .select({
        id: drivePublicLink.id,
        itemId: drivePublicLink.itemId,
      })
      .from(drivePublicLink)
      .where(eq(drivePublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    await this.db
      .update(drivePublicLink)
      .set({ isActive: false })
      .where(eq(drivePublicLink.id, id));

    await this.pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_REVOKED, {
      itemId: link.itemId,
      publicLinkId: id,
    });
  }

  async list(itemId: string, itemType: "file" | "folder") {
    return this.db
      .select()
      .from(drivePublicLink)
      .where(
        and(
          eq(drivePublicLink.itemId, itemId),
          eq(drivePublicLink.itemType, itemType),
        ),
      );
  }

  async resolve(
    input: ResolvePublicLinkInput,
    requestInfo?: { ip?: string; userAgent?: string },
  ): Promise<ResolvedPublicLink | null> {
    const parsed = parse(ResolvePublicLinkSchema, input);

    const [link] = await this.db
      .select()
      .from(drivePublicLink)
      .where(eq(drivePublicLink.token, parsed.token))
      .limit(1);

    if (!link?.isActive) {
      return null;
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return null;
    }

    if (link.maxViews !== null && link.viewCount >= link.maxViews) {
      return null;
    }

    if (link.password) {
      if (!parsed.password) {
        return null;
      }

      const valid = await Bun.password.verify(parsed.password, link.password);
      if (!valid) {
        return null;
      }
    }

    await this.db
      .update(drivePublicLink)
      .set({ viewCount: sql`${drivePublicLink.viewCount} + 1` })
      .where(eq(drivePublicLink.id, link.id));

    await this.accessService.logAccess({
      action: "public_link_accessed",
      ip: requestInfo?.ip ?? null,
      itemId: link.itemId,
      itemType: link.itemType,
      publicLinkId: link.id,
      userAgent: requestInfo?.userAgent ?? null,
    });

    await this.pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_ACCESSED, {
      ip: requestInfo?.ip ?? null,
      publicLink: {
        id: link.id,
        itemId: link.itemId,
        token: link.token,
      },
      userAgent: requestInfo?.userAgent ?? null,
    });

    return {
      itemId: link.itemId,
      itemType: link.itemType,
      permission: link.permission,
      publicLinkId: link.id,
    };
  }

  async getById(id: string) {
    const [link] = await this.db
      .select()
      .from(drivePublicLink)
      .where(eq(drivePublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    return link;
  }

  private generateToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let token = "";
    for (const byte of bytes) {
      token += chars[byte % chars.length];
    }
    return token;
  }
}
