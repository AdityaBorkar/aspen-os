import { Workflow } from "@aspen-os/platform/server";
import { eq, sql } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsPublicLink } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { logAccess } from "../services/item-access-service";
import { ResolvePublicLinkSchema } from "../types";

export interface ResolvedPublicLink {
  itemId: string;
  itemType: "file" | "folder";
  permission: "view" | "edit";
  publicLinkId: string;
}

const ResolveInputSchema = object({ input: ResolvePublicLinkSchema });

export const resolveItemPublicLink = Workflow.name("dms.public-link.resolve")
  .input(ResolveInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ResolvePublicLinkSchema, input);

    const [link] = await ctx.db
      .select()
      .from(dmsPublicLink)
      .where(eq(dmsPublicLink.token, parsed.token))
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
      .update(dmsPublicLink)
      .set({ viewCount: sql`${dmsPublicLink.viewCount} + 1` })
      .where(eq(dmsPublicLink.id, link.id));

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

    await ctx.pubsub.publish(ITEM_EVENTS.PUBLIC_LINK_ACCESSED, {
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
