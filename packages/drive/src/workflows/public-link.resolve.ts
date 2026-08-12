import { Workflow } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";
import { object, parse } from "valibot";

import { drivePublicLink } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { logAccess } from "../services/access-service";
import { ResolvePublicLinkSchema } from "../types";

export interface ResolvedPublicLink {
  itemId: string;
  itemType: "file" | "folder";
  permission: "view" | "edit";
  publicLinkId: string;
}

const ResolveInputSchema = object({ input: ResolvePublicLinkSchema });

export const resolvePublicLink = Workflow.name("drive.public-link.resolve")
  .input(ResolveInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResolvePublicLinkSchema, input);

    const [link] = await ctx.db
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

    await ctx.db
      .update(drivePublicLink)
      .set({ viewCount: sql`${drivePublicLink.viewCount} + 1` })
      .where(eq(drivePublicLink.id, link.id));

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
