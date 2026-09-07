import { dmsShare } from "#/db-schemas";
import { SHARE_EVENTS } from "#/pubsub";
import { resolveEntity } from "#/services/entity-resolver";
import { CreateShareSchema, parseShareExpiry } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, GRANTEE_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateShareSchema });

export const createShare = Workflow.name("dms.share.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShareSchema, input);

    const entity = await resolveEntity(ctx.db, parsed.entityType, parsed.entityId);
    if (!entity) {
      throw new Error(
        `${parsed.entityType === "file" ? "File" : "Folder"} "${parsed.entityId}" not found.`,
      );
    }
    if (!entity.isSharable) {
      if (entity.kind === "file") {
        throw new Error("Files must be active before they can be shared. Classify the file first.");
      }
      throw new Error("Trashed folders cannot be shared. Restore the folder first.");
    }

    const existing = await ctx.db
      .select({ id: dmsShare.id })
      .from(dmsShare)
      .where(
        and(
          eq(dmsShare.entityType, parsed.entityType),
          eq(dmsShare.entityId, parsed.entityId),
          eq(dmsShare.granteeType, parsed.granteeType),
          eq(dmsShare.granteeId, parsed.granteeId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      throw new Error("This entity is already shared with the specified grantee.");
    }

    const expiresAt = parseShareExpiry(parsed.expiresAt ?? null);

    const [share] = await ctx.db
      .insert(dmsShare)
      .values({
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        expiresAt,
        granteeId: parsed.granteeId,
        granteeType: parsed.granteeType,
        message: parsed.message ?? null,
        permission: parsed.permission ?? "viewer",
        shareToken: parsed.granteeType === GRANTEE_TYPE.CONTACT ? crypto.randomUUID() : null,
        sharedBy: parsed.sharedBy,
      })
      .returning();

    if (!share) {
      throw new Error("Failed to create share.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SHARED,
        crudAction: "create",
        entityId: parsed.entityId,
        entityType: AUDIT_ENTITY_TYPE.SHARE,
        metadata: {
          entityType: parsed.entityType,
          granteeId: parsed.granteeId,
          granteeType: parsed.granteeType,
          permission: share.permission,
          shareId: share.id,
        },
      });

      await ctx.pubsub.publish(SHARE_EVENTS.CREATED, {
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        granteeId: parsed.granteeId,
        granteeType: parsed.granteeType,
        shareId: share.id,
      });
    });

    return share;
  });
