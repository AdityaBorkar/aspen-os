import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

import { dmsPin } from "../../db-schemas";
import { AUDIT_ACTION } from "../../utils/constants";
import { auditEntityType, PinItemInputSchema } from "./shared";

export const pinItem = Workflow.name("dms.pin.create")
  .input(PinItemInputSchema)
  .handler(async ({ itemId, itemType, userId }, ctx) => {
    const existing = await ctx.db
      .select({ id: dmsPin.id })
      .from(dmsPin)
      .where(
        and(eq(dmsPin.userId, userId), eq(dmsPin.itemType, itemType), eq(dmsPin.itemId, itemId)),
      )
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const [pin] = await ctx.db.insert(dmsPin).values({ itemId, itemType, userId }).returning();

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "create",
      entityId: itemId,
      entityType: auditEntityType(itemType),
      metadata: { itemType },
    });

    return pin;
  });
