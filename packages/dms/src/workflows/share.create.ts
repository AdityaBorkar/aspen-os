import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, parse } from "valibot";

import { dmsDocument, dmsShare } from "../db-schemas";
import { SHARE_EVENTS } from "../pubsub";
import { CreateShareSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, GRANTEE_TYPE } from "../utils/constants";

const CreateInputSchema = object({ input: CreateShareSchema });

export const createShare = Workflow.name("dms.share.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateShareSchema, input);

    const [doc] = await ctx.db
      .select({ id: dmsDocument.id, status: dmsDocument.status })
      .from(dmsDocument)
      .where(eq(dmsDocument.id, parsed.documentId))
      .limit(1);

    if (!doc) {
      throw new Error(`Document "${parsed.documentId}" not found.`);
    }
    if (doc.status !== "active") {
      throw new Error(
        "Documents must be active before they can be shared. Classify the document first.",
      );
    }

    const existing = await ctx.db
      .select({ id: dmsShare.id })
      .from(dmsShare)
      .where(
        and(
          eq(dmsShare.documentId, parsed.documentId),
          eq(dmsShare.granteeType, parsed.granteeType),
          eq(dmsShare.granteeId, parsed.granteeId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      throw new Error("This document is already shared with the specified grantee.");
    }

    const [share] = await ctx.db
      .insert(dmsShare)
      .values({
        documentId: parsed.documentId,
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
        granteeId: parsed.granteeId,
        granteeType: parsed.granteeType,
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
        entityId: parsed.documentId,
        entityType: AUDIT_ENTITY_TYPE.SHARE,
        metadata: {
          granteeId: parsed.granteeId,
          granteeType: parsed.granteeType,
          permission: share.permission,
          shareId: share.id,
        },
      });

      await ctx.pubsub.publish(SHARE_EVENTS.CREATED, {
        documentId: parsed.documentId,
        granteeId: parsed.granteeId,
        granteeType: parsed.granteeType,
        shareId: share.id,
      });
    });

    return share;
  });
