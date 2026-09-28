import { productsBarcode } from "#/db-schemas";
import { BARCODE_EVENTS } from "#/pubsub";
import { AddBarcodeSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";
import { assertBarcodeUnique } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";

export const addBarcode = Workflow.name("products.barcode.add")
  .input(AddBarcodeSchema)
  .handler(async (input, ctx) => {
    const item = await ctx.step.run(fetchItemStep, { id: input.itemId });
    if (item.is_disabled) {
      throw new Error("Cannot add barcode to a disabled item.");
    }
    await assertBarcodeUnique(ctx.db, input.barcode);
    const [row] = await ctx.db
      .insert(productsBarcode)
      .values({
        barcode: input.barcode,
        barcode_type: input.barcodeType ?? "other",
        item_id: input.itemId,
        uom: input.uom ?? null,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add barcode.");
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
        newState: { barcode: row.barcode, itemId: row.item_id },
      });
      await ctx.pubsub.publish(BARCODE_EVENTS.ADDED, {
        barcode: { barcode: row.barcode, id: row.id, itemId: row.item_id },
      });
    });
    return row;
  });
