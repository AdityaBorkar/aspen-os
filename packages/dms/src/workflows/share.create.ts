import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsFile, dmsFolder, dmsShare } from "../db-schemas";
import { SHARE_EVENTS } from "../pubsub";
import { CreateShareSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, GRANTEE_TYPE } from "../utils/constants";

const CreateInputSchema = object({ input: CreateShareSchema });

export const createShare = Workflow.name("dms.share.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShareSchema, input);

    if (parsed.entityType === "file") {
      const [file] = await ctx.db
        .select({ id: dmsFile.id, status: dmsFile.status })
        .from(dmsFile)
        .where(eq(dmsFile.id, parsed.entityId))
        .limit(1);

      if (!file) {
        throw new Error(`File "${parsed.entityId}" not found.`);
      }
      if (file.status !== "active") {
        throw new Error("Files must be active before they can be shared. Classify the file first.");
      }
    } else {
      const [folder] = await ctx.db
        .select({ id: dmsFolder.id })
        .from(dmsFolder)
        .where(eq(dmsFolder.id, parsed.entityId))
        .limit(1);

      if (!folder) {
        throw new Error(`Folder "${parsed.entityId}" not found.`);
      }
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

    const [share] = await ctx.db
      .insert(dmsShare)
      .values({
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
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
