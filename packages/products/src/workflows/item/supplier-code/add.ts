import { productsItemSupplierCode } from "#/db-schemas";
import { AddSupplierCodeSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const addSupplierCode = Workflow.name("products.item.supplier-code.add")
  .input(AddSupplierCodeSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchItemStep, { id: input.itemId });
    const [existing] = await ctx.db
      .select({ id: productsItemSupplierCode.id })
      .from(productsItemSupplierCode)
      .where(
        and(
          eq(productsItemSupplierCode.item_id, input.itemId),
          eq(productsItemSupplierCode.supplier_id, input.supplierId),
          eq(productsItemSupplierCode.supplier_part_no, input.supplierPartNo),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error("Supplier part mapping already exists.");
    }
    const [row] = await ctx.db
      .insert(productsItemSupplierCode)
      .values({
        item_id: input.itemId,
        supplier_id: input.supplierId,
        supplier_part_no: input.supplierPartNo,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add supplier code.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
        newState: { itemId: row.item_id, supplierId: row.supplier_id },
      });
    });
    return row;
  });
