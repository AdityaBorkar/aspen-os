import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsShare } from "../../db-schemas";
import { SHARE_EVENTS } from "../../pubsub";
import { IdSchema } from "../../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../utils/constants";

export const removeShare = Workflow.name("dms.share.remove")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    const [share] = await ctx.db.select().from(dmsShare).where(eq(dmsShare.id, id)).limit(1);

    if (!share) {
      throw new Error(`Share "${id}" not found.`);
    }

    await ctx.db.delete(dmsShare).where(eq(dmsShare.id, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.SHARE_REVOKED,
        crudAction: "delete",
        entityId: share.entityId,
        entityType: AUDIT_ENTITY_TYPE.SHARE,
        metadata: {
          entityType: share.entityType,
          granteeId: share.granteeId,
          granteeType: share.granteeType,
          shareId: id,
        },
      });

      await ctx.pubsub.publish(SHARE_EVENTS.REVOKED, {
        entityId: share.entityId,
        entityType: share.entityType,
        granteeId: share.granteeId,
        granteeType: share.granteeType,
        shareId: id,
      });
    });

    return { revoked: true, shareId: id };
  });
