import { dmsLegalHold } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

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
        entityId: hold.fileId,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { reason: hold.reason },
      });

      await ctx.pubsub.publish(FILE_EVENTS.HOLD_RELEASED, {
        fileId: hold.fileId,
        reason: hold.reason,
      });
    });

    return updated ?? hold;
  });
