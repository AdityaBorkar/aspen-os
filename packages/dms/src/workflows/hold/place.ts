import { dmsLegalHold } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object, string } from "valibot";

const PlaceHoldInputSchema = object({
  fileId: IdSchema,
  placedBy: IdSchema,
  reason: string(),
});

export const placeLegalHold = Workflow.name("dms.hold.place")
  .input(PlaceHoldInputSchema)
  .handler(async ({ fileId, placedBy, reason }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id: fileId });
    if (file.status === "trashed" || file.status === "triaged") {
      throw new Error(`File "${fileId}" cannot be placed on hold in its current state.`);
    }

    const [active] = await ctx.db
      .select()
      .from(dmsLegalHold)
      .where(and(eq(dmsLegalHold.fileId, fileId), isNull(dmsLegalHold.releasedAt)))
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
          entityId: fileId,
          entityType: AUDIT_ENTITY_TYPE.FILE,
          metadata: { reason },
        });

        await ctx.pubsub.publish(FILE_EVENTS.HOLD_PLACED, {
          fileId,
          reason,
        });
      });

      return updated ?? active;
    }

    const [hold] = await ctx.db
      .insert(dmsLegalHold)
      .values({ fileId, placedBy, reason })
      .returning();

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.HOLD_PLACED,
        crudAction: "create",
        entityId: fileId,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { reason },
      });

      await ctx.pubsub.publish(FILE_EVENTS.HOLD_PLACED, {
        fileId,
        reason,
      });
    });

    return hold;
  });
