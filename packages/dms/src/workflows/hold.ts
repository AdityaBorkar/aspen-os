import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsLegalHold } from "../db-schemas";
import { DOCUMENT_EVENTS } from "../pubsub";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchDocumentStep } from "../workflow-steps/fetch-document";

const PlaceHoldInputSchema = object({
  documentId: IdSchema,
  placedBy: IdSchema,
  reason: string(),
});

export const placeLegalHold = Workflow.name("dms.hold.place")
  .input(PlaceHoldInputSchema)
  .handler(async ({ documentId, placedBy, reason }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId });
    if (doc.status === "deleted" || doc.status === "triaged") {
      throw new Error(`Document "${documentId}" cannot be placed on hold in its current state.`);
    }

    const [active] = await ctx.db
      .select()
      .from(dmsLegalHold)
      .where(and(eq(dmsLegalHold.documentId, documentId), isNull(dmsLegalHold.releasedAt)))
      .limit(1);

    if (active) {
      const [updated] = await ctx.db
        .update(dmsLegalHold)
        .set({ placedBy, reason, releasedAt: null, releasedBy: null })
        .where(eq(dmsLegalHold.id, active.id))
        .returning();

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.HOLD_PLACED,
          crudAction: "update",
          entityId: documentId,
          entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
          metadata: { reason },
        });

        await ctx.pubsub.publish(DOCUMENT_EVENTS.HOLD_PLACED, {
          documentId,
          reason,
        });
      });

      return updated ?? active;
    }

    const [hold] = await ctx.db
      .insert(dmsLegalHold)
      .values({ documentId, placedBy, reason })
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.HOLD_PLACED,
        crudAction: "create",
        entityId: documentId,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { reason },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.HOLD_PLACED, {
        documentId,
        reason,
      });
    });

    return hold;
  });

export const releaseLegalHold = Workflow.name("dms.hold.release")
  .input(object({ holdId: IdSchema, releasedBy: IdSchema }))
  .handler(async ({ holdId, releasedBy }, ctx) => {
    const [hold] = await ctx.db
      .select()
      .from(dmsLegalHold)
      .where(eq(dmsLegalHold.id, holdId))
      .limit(1);

    if (!hold) {
      throw new Error(`Legal hold "${holdId}" not found.`);
    }
    if (hold.releasedAt) {
      throw new Error(`Legal hold "${holdId}" is already released.`);
    }

    const [updated] = await ctx.db
      .update(dmsLegalHold)
      .set({ releasedAt: new Date(), releasedBy })
      .where(eq(dmsLegalHold.id, holdId))
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.HOLD_RELEASED,
        crudAction: "update",
        entityId: hold.documentId,
        entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
        metadata: { reason: hold.reason },
      });

      await ctx.pubsub.publish(DOCUMENT_EVENTS.HOLD_RELEASED, {
        documentId: hold.documentId,
        reason: hold.reason,
      });
    });

    return updated ?? hold;
  });
