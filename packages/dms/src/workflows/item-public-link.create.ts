import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

import { dmsPublicLink } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { CreatePublicLinkSchema } from "../types";

const CreateInputSchema = object({ input: CreatePublicLinkSchema });

export const createItemPublicLink = Workflow.name("dms.public-link.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePublicLinkSchema, input);

    const token = generateToken();
    const hashedPassword = parsed.password
      ? await Bun.password.hash(parsed.password)
      : null;

    const [publicLink] = await ctx.db
      .insert(dmsPublicLink)
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

    await ctx.pubsub.publish(ITEM_EVENTS.PUBLIC_LINK_CREATED, {
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
