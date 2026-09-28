import { productsItemPrice } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemPriceStep } from "#/workflow-steps/fetch-item-price";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeleteInputSchema = object({ id: IdSchema });

export const deleteItemPrice = Workflow.name("products.item-price.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchItemPriceStep, { id });
    if (current.status !== "draft") {
      throw new Error("Only draft item prices can be hard-deleted. Expire or cancel the rest.");
    }
    if (current.fetch_count > 0) {
      throw new Error("Cannot delete an item price after its first fetch-use.");
    }
    const [deleted] = await ctx.db
      .delete(productsItemPrice)
      .where(eq(productsItemPrice.id, id))
      .returning({ id: productsItemPrice.id });
    if (!deleted) {
      throw new Error(`Item price with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM_PRICE,
      });
    });
    return { deleted: true };
  });
