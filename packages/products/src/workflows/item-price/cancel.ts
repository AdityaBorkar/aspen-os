import { productsItemPrice } from "#/db-schemas";
import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemPriceStep } from "#/workflow-steps/fetch";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const cancelItemPrice = Workflow.name("products.item-price.cancel")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchItemPriceStep, { id });
    if (current.status === "cancelled") {
      return current;
    }
    if (current.status === "expired") {
      throw new Error("Expired item prices cannot be cancelled.");
    }
    if (current.fetch_count > 0) {
      throw new Error("Cannot cancel an item price after its first fetch-use. Expire it instead.");
    }
    const [updated] = await ctx.db
      .update(productsItemPrice)
      .set({ status: "cancelled", updated_at: new Date() })
      .where(eq(productsItemPrice.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Item price with id "${id}" not found.`);
    }
    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.CANCELLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
      },
      ITEM_PRICE_EVENTS.UPDATED,
      {
        changes: { status: "cancelled" },
        itemPrice: { id: updated.id, itemId: updated.item_id, priceListId: updated.price_list_id },
      },
    );
    return updated;
  });
