import { productsItemPrice } from "#/db-schemas";
import { ITEM_PRICE_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemPriceStep } from "#/workflow-steps/fetch-item-price";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const expireItemPrice = Workflow.name("products.item-price.expire")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchItemPriceStep, { id });
    if (current.status === "expired") {
      return current;
    }
    if (current.status === "cancelled") {
      throw new Error("Cancelled item prices cannot expire. They are already out of circulation.");
    }
    const [updated] = await ctx.db
      .update(productsItemPrice)
      .set({ status: "expired", updated_at: new Date() })
      .where(eq(productsItemPrice.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Item price with id "${id}" not found.`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.EXPIRED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
      });
      await ctx.pubsub.publish(ITEM_PRICE_EVENTS.EXPIRED, { itemPriceId: id });
    });
    return updated;
  });
