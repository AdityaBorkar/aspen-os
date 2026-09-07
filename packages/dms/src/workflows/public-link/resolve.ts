import { dmsPublicLink } from "#/db-schemas";
import { PUBLIC_LINK_EVENTS } from "#/pubsub";
import { resolveEntity } from "#/services/entity-resolver";
import { ResolvePublicLinkSchema } from "#/types";
import { logAccess } from "#/workflow-steps/access-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { object, parse } from "valibot";

export interface ResolvedPublicLink {
  entityId: string;
  entityType: "file" | "folder";
  permission: "view" | "edit";
  publicLinkId: string;
}

const ResolveInputSchema = object({ input: ResolvePublicLinkSchema });

export const resolvePublicLink = Workflow.name("dms.public-link.resolve")
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

    const entity = await resolveEntity(ctx.db, link.entityType, link.entityId);
    if (!entity?.isAccessible) {
      return null;
    }

    // Atomic view-count bump guarded by the max-views cap. If a concurrent
    // resolve wins the last view, this update touches zero rows and we treat
    // the link as exhausted.
    const bumped =
      link.maxViews === null
        ? await ctx.db
            .update(dmsPublicLink)
            .set({ viewCount: sql`${dmsPublicLink.viewCount} + 1` })
            .where(eq(dmsPublicLink.id, link.id))
            .returning({ id: dmsPublicLink.id })
        : await ctx.db
            .update(dmsPublicLink)
            .set({ viewCount: sql`${dmsPublicLink.viewCount} + 1` })
            .where(
              and(
                eq(dmsPublicLink.id, link.id),
                or(
                  isNull(dmsPublicLink.maxViews),
                  sql`${dmsPublicLink.viewCount} < ${dmsPublicLink.maxViews}`,
                ),
              ),
            )
            .returning({ id: dmsPublicLink.id });

    if (bumped.length === 0) {
      return null;
    }

    await logAccess(
      {
        action: "public_link_accessed",
        entityId: link.entityId,
        entityType: link.entityType,
        ip: null,
        publicLinkId: link.id,
        userAgent: null,
      },
      ctx.db,
    );

    await ctx.pubsub.publish(PUBLIC_LINK_EVENTS.ACCESSED, {
      entityId: link.entityId,
      entityType: link.entityType,
      id: link.id,
      ip: null,
      token: link.token,
      userAgent: null,
    });

    return {
      entityId: link.entityId,
      entityType: link.entityType,
      permission: link.permission,
      publicLinkId: link.id,
    };
  });
