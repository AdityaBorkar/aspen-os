import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsPin } from "../db-schemas";
import { IdSchema, PinItemTypeSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";

const PinItemInputSchema = object({
  itemId: IdSchema,
  itemType: PinItemTypeSchema,
  userId: IdSchema,
});

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
      entityType: AUDIT_ENTITY_TYPE.VIEW,
      metadata: { itemType },
    });

    return pin;
  });

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
      entityType: AUDIT_ENTITY_TYPE.VIEW,
      metadata: { itemType },
    });

    return { removed: true };
  });

export const listPins = Workflow.name("dms.pin.list").handler(
  async (input: { userId: string }, ctx) => {
    const rows = await ctx.db
      .select()
      .from(dmsPin)
      .where(eq(dmsPin.userId, input.userId))
      .orderBy(dmsPin.sortOrder);
    return rows;
  },
);
