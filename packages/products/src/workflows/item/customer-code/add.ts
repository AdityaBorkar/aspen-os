import { productsItemCustomerCode } from "#/db-schemas";
import { AddCustomerCodeSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const addCustomerCode = Workflow.name("products.item.customer-code.add")
  .input(AddCustomerCodeSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchItemStep, { id: input.itemId });
    const [existing] = await ctx.db
      .select({ id: productsItemCustomerCode.id })
      .from(productsItemCustomerCode)
      .where(
        and(
          eq(productsItemCustomerCode.item_id, input.itemId),
          eq(productsItemCustomerCode.customer_id, input.customerId),
          eq(productsItemCustomerCode.ref_code, input.refCode),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error("Customer reference mapping already exists.");
    }
    const [row] = await ctx.db
      .insert(productsItemCustomerCode)
      .values({
        customer_id: input.customerId,
        item_id: input.itemId,
        ref_code: input.refCode,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add customer code.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
        newState: { customerId: row.customer_id, itemId: row.item_id },
      });
    });
    return row;
  });
