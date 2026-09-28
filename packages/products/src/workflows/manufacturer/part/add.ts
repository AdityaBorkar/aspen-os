import { productsManufacturerPart } from "#/db-schemas";
import { AddManufacturerPartSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep, fetchManufacturerStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const addManufacturerPart = Workflow.name("products.manufacturer.part.add")
  .input(AddManufacturerPartSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchManufacturerStep, { id: input.manufacturerId });
    await ctx.step.run(fetchItemStep, { id: input.itemId });
    const [existing] = await ctx.db
      .select({ id: productsManufacturerPart.id })
      .from(productsManufacturerPart)
      .where(
        and(
          eq(productsManufacturerPart.item_id, input.itemId),
          eq(productsManufacturerPart.manufacturer_id, input.manufacturerId),
          eq(productsManufacturerPart.manufacturer_part_no, input.manufacturerPartNo),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error("Manufacturer part mapping already exists.");
    }
    const [row] = await ctx.db
      .insert(productsManufacturerPart)
      .values({
        item_id: input.itemId,
        manufacturer_id: input.manufacturerId,
        manufacturer_part_no: input.manufacturerPartNo,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add manufacturer part.");
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: row.id,
      entityType: AUDIT_ENTITY_TYPE.MANUFACTURER,
      newState: {
        itemId: row.item_id,
        manufacturerId: row.manufacturer_id,
        partNo: row.manufacturer_part_no,
      },
    });
    return row;
  });
