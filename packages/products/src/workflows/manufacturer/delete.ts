import { productsItem, productsManufacturer, productsManufacturerPart } from "#/db-schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchManufacturerStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const DeleteInputSchema = object({ id: string() });

export const deleteManufacturer = Workflow.name("products.manufacturer.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchManufacturerStep, { id });
    const [partRef] = await ctx.db
      .select({ id: productsManufacturerPart.id })
      .from(productsManufacturerPart)
      .where(eq(productsManufacturerPart.manufacturer_id, id))
      .limit(1);
    if (partRef) {
      throw new Error("Cannot delete manufacturer while manufacturer parts reference it.");
    }
    const [itemRef] = await ctx.db
      .select({ id: productsItem.id })
      .from(productsItem)
      .where(eq(productsItem.manufacturer_id, id))
      .limit(1);
    if (itemRef) {
      throw new Error("Cannot delete manufacturer while items reference it.");
    }
    const [deleted] = await ctx.db
      .delete(productsManufacturer)
      .where(eq(productsManufacturer.id, id))
      .returning({ id: productsManufacturer.id });
    if (!deleted) {
      throw new Error(`Manufacturer with id "${id}" not found.`);
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.MANUFACTURER,
    });
    return { deleted: true };
  });
