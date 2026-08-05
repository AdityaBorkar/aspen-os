import { Workflow } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import { object, parse, string } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import { logAccess } from "../services/access-service";
import {
  CreatePublicLinkSchema,
  DriveItemTypeSchema,
  ResolvePublicLinkSchema,
  UpdatePublicLinkSchema,
} from "../types";

export interface ResolvedPublicLink {
  itemId: string;
  itemType: "file" | "folder";
  permission: "view" | "edit";
  publicLinkId: string;
}

const CreateInputSchema = object({ input: CreatePublicLinkSchema });
const PublicLinkIdSchema = string();
const WithIdSchema = object({ id: PublicLinkIdSchema });
const UpdateInputSchema = object({
  id: PublicLinkIdSchema,
  input: UpdatePublicLinkSchema,
});
const ListSchema = object({ itemId: string(), itemType: DriveItemTypeSchema });
const ResolveInputSchema = object({ input: ResolvePublicLinkSchema });

export const createPublicLink = Workflow.name("drive.public-link.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePublicLinkSchema, input);

    const token = generateToken();
    const hashedPassword = parsed.password
      ? await Bun.password.hash(parsed.password)
      : null;

    const [publicLink] = await ctx.db
      .insert(s.drivePublicLink)
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

    await ctx.pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_CREATED, {
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
  });

export const updatePublicLink = Workflow.name("drive.public-link.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
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

    const [updated] = await ctx.db
      .update(s.drivePublicLink)
      .set(updates)
      .where(eq(s.drivePublicLink.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    return updated;
  });

export const revokePublicLink = Workflow.name("drive.public-link.revoke")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [link] = await ctx.db
      .select({
        id: s.drivePublicLink.id,
        itemId: s.drivePublicLink.itemId,
      })
      .from(s.drivePublicLink)
      .where(eq(s.drivePublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    await ctx.db
      .update(s.drivePublicLink)
      .set({ isActive: false })
      .where(eq(s.drivePublicLink.id, id));

    await ctx.pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_REVOKED, {
      itemId: link.itemId,
      publicLinkId: id,
    });
  });

export const listPublicLinks = Workflow.name("drive.public-link.list")
  .input(ListSchema)
  .handler(async ({ itemId, itemType }, ctx) => {
    return ctx.db
      .select()
      .from(s.drivePublicLink)
      .where(
        and(
          eq(s.drivePublicLink.itemId, itemId),
          eq(s.drivePublicLink.itemType, itemType),
        ),
      );
  });

export const resolvePublicLink = Workflow.name("drive.public-link.resolve")
  .input(ResolveInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResolvePublicLinkSchema, input);

    const [link] = await ctx.db
      .select()
      .from(s.drivePublicLink)
      .where(eq(s.drivePublicLink.token, parsed.token))
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

    await ctx.db
      .update(s.drivePublicLink)
      .set({ viewCount: sql`${s.drivePublicLink.viewCount} + 1` })
      .where(eq(s.drivePublicLink.id, link.id));

    await logAccess(
      {
        action: "public_link_accessed",
        ip: null,
        itemId: link.itemId,
        itemType: link.itemType,
        publicLinkId: link.id,
        userAgent: null,
      },
      ctx.db,
    );

    await ctx.pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_ACCESSED, {
      ip: null,
      publicLink: {
        id: link.id,
        itemId: link.itemId,
        token: link.token,
      },
      userAgent: null,
    });

    return {
      itemId: link.itemId,
      itemType: link.itemType,
      permission: link.permission,
      publicLinkId: link.id,
    };
  });

export const getPublicLinkById = Workflow.name("drive.public-link.get-by-id")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const [link] = await ctx.db
      .select()
      .from(s.drivePublicLink)
      .where(eq(s.drivePublicLink.id, id))
      .limit(1);

    if (!link) {
      throw new Error(`Public link with id "${id}" not found.`);
    }

    return link;
  });

export const publicLinks = {
  create: createPublicLink,
  get: getPublicLinkById,
  list: listPublicLinks,
  resolve: resolvePublicLink,
  revoke: revokePublicLink,
  update: updatePublicLink,
};

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let token = "";
  for (const byte of bytes) {
    token += chars[byte % chars.length];
  }
  return token;
}
