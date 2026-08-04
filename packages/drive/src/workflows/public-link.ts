import type { PubSubUnit } from "@aspen-os/platform/server";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { parse } from "valibot";

import * as s from "../db-schema";
import { DRIVE_EVENTS } from "../pubsub-events";
import { type AccessServiceDeps, logAccess } from "../services/access-service";
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

export interface PublicLinkDeps {
  accessDeps: AccessServiceDeps;
  db: DB;
  pubsub: PubSubUnit;
}

export async function createPublicLink(
  input: CreatePublicLinkInput,
  { db, pubsub }: PublicLinkDeps,
) {
  const parsed = parse(CreatePublicLinkSchema, input);

  const token = generateToken();
  const hashedPassword = parsed.password
    ? await Bun.password.hash(parsed.password)
    : null;

  const [publicLink] = await db
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

  await pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_CREATED, {
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

export async function updatePublicLink(
  { id, input }: { id: string; input: UpdatePublicLinkInput },
  { db }: PublicLinkDeps,
) {
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

  const [updated] = await db
    .update(s.drivePublicLink)
    .set(updates)
    .where(eq(s.drivePublicLink.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Public link with id "${id}" not found.`);
  }

  return updated;
}

export async function revokePublicLink(
  { id }: { id: string },
  { db, pubsub }: PublicLinkDeps,
) {
  const [link] = await db
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

  await db
    .update(s.drivePublicLink)
    .set({ isActive: false })
    .where(eq(s.drivePublicLink.id, id));

  await pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_REVOKED, {
    itemId: link.itemId,
    publicLinkId: id,
  });
}

export async function listPublicLinks(
  { itemId, itemType }: { itemId: string; itemType: "file" | "folder" },
  { db }: PublicLinkDeps,
) {
  return db
    .select()
    .from(s.drivePublicLink)
    .where(
      and(
        eq(s.drivePublicLink.itemId, itemId),
        eq(s.drivePublicLink.itemType, itemType),
      ),
    );
}

export async function resolvePublicLink(
  input: ResolvePublicLinkInput,
  {
    accessDeps,
    db,
    pubsub,
    requestInfo,
  }: PublicLinkDeps & {
    requestInfo?: { ip?: string; userAgent?: string };
  },
): Promise<ResolvedPublicLink | null> {
  const parsed = parse(ResolvePublicLinkSchema, input);

  const [link] = await db
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

  await db
    .update(s.drivePublicLink)
    .set({ viewCount: sql`${s.drivePublicLink.viewCount} + 1` })
    .where(eq(s.drivePublicLink.id, link.id));

  await logAccess(
    {
      action: "public_link_accessed",
      ip: requestInfo?.ip ?? null,
      itemId: link.itemId,
      itemType: link.itemType,
      publicLinkId: link.id,
      userAgent: requestInfo?.userAgent ?? null,
    },
    accessDeps,
  );

  await pubsub.publish(DRIVE_EVENTS.PUBLIC_LINK_ACCESSED, {
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

export async function getPublicLinkById(
  { id }: { id: string },
  { db }: PublicLinkDeps,
) {
  const [link] = await db
    .select()
    .from(s.drivePublicLink)
    .where(eq(s.drivePublicLink.id, id))
    .limit(1);

  if (!link) {
    throw new Error(`Public link with id "${id}" not found.`);
  }

  return link;
}

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
