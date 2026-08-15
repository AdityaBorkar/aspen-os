import { dmsPin } from "#/db-schemas";
import { AUDIT_ACTION } from "#/utils/constants";
import { auditEntityType, PinItemInputSchema } from "#/workflows/pin/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const unpinItem = Workflow.name("dms.pin.delete")
  .input(PinItemInputSchema)
  .handler(async ({ itemId, itemType, userId }, ctx) => {
    await ctx.db
      .delete(dmsPin)
      .where(
        and(eq(dmsPin.userId, userId), eq(dmsPin.itemType, itemType), eq(dmsPin.itemId, itemId)),
      );

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: itemId,
      entityType: auditEntityType(itemType),
      metadata: { itemType },
    });

    return { removed: true };
  });
