import { dmsPublicLink } from "#/db-schemas";
import { PUBLIC_LINK_EVENTS } from "#/pubsub";
import { resolveEntity } from "#/services/entity-resolver";
import { CreatePublicLinkSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreatePublicLinkSchema });

export const createPublicLink = Workflow.name("dms.public-link.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreatePublicLinkSchema, input);

    const entity = await resolveEntity(ctx.db, parsed.entityType, parsed.entityId);
    if (!entity) {
      throw new Error(
        `${parsed.entityType === "file" ? "File" : "Folder"} "${parsed.entityId}" not found.`,
      );
    }
    if (!entity.isSharable) {
      throw new Error("Only active files and non-trashed folders can get public links.");
    }

    const token = generateToken();
    const hashedPassword = parsed.password ? await Bun.password.hash(parsed.password) : null;

    const [publicLink] = await ctx.db
      .insert(dmsPublicLink)
      .values({
        createdBy: parsed.createdBy,
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        expiresAt: parsed.expiresAt ?? null,
        maxViews: parsed.maxViews ?? null,
        password: hashedPassword,
        permission: parsed.permission,
        token,
      })
      .returning();

    if (!publicLink) {
      throw new Error("Failed to create public link.");
    }

    await ctx.pubsub.publish(PUBLIC_LINK_EVENTS.CREATED, {
      entityId: publicLink.entityId,
      entityType: publicLink.entityType,
      id: publicLink.id,
      permission: publicLink.permission,
      token: publicLink.token,
    });

    return publicLink;
  });

function generateToken(): string {
  return crypto.randomUUID().replaceAll("-", "");
}
