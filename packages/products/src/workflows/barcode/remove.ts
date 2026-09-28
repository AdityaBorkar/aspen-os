import { productsBarcode } from "#/db-schemas";
import { BARCODE_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchBarcodeStep } from "#/workflow-steps/fetch-barcode";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const RemoveInputSchema = object({ id: IdSchema });

export const removeBarcode = Workflow.name("products.barcode.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchBarcodeStep, { id });
    const [deleted] = await ctx.db
      .delete(productsBarcode)
      .where(eq(productsBarcode.id, id))
      .returning({ id: productsBarcode.id });
    if (!deleted) {
      throw new Error(`Barcode with id "${id}" not found.`);
    }
    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
      });
      await ctx.pubsub.publish(BARCODE_EVENTS.REMOVED, {
        barcodeId: id,
        itemId: current.item_id,
      });
    });
    return { deleted: true };
  });
