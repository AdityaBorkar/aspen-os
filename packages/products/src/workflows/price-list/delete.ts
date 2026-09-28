import { productsItemPrice, productsPriceList } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import {
  AUDIT_ACTION,
  AUDIT_ENTITY_TYPE,
  STANDARD_BUYING_PRICE_LIST,
  STANDARD_SELLING_PRICE_LIST,
} from "#/utils/constants";
import { fetchPriceListStep } from "#/workflow-steps/fetch-price-list";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeleteInputSchema = object({ id: IdSchema });

export const deletePriceList = Workflow.name("products.price-list.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchPriceListStep, { id });
    if (
      current.name === STANDARD_SELLING_PRICE_LIST ||
      current.name === STANDARD_BUYING_PRICE_LIST
    ) {
      throw new Error(`Seeded price list "${current.name}" can never be hard-deleted.`);
    }
    const [row] = await ctx.db
      .select({ id: productsItemPrice.id })
      .from(productsItemPrice)
      .where(eq(productsItemPrice.price_list_id, id))
      .limit(1);
    if (row) {
      throw new Error("Cannot delete price list while item prices reference it.");
    }
    const [deleted] = await ctx.db
      .delete(productsPriceList)
      .where(eq(productsPriceList.id, id))
      .returning({ id: productsPriceList.id });
    if (!deleted) {
      throw new Error(`Price list with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.PRICE_LIST,
      });
    });
    return { deleted: true };
  });
