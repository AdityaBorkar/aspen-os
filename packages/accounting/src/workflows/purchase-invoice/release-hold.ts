import { accountingPurchaseInvoice } from "#/db-schemas/purchase";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { assertUpdated } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const InputSchema = object({ id: string() });

export const releasePurchaseInvoiceHold = Workflow.name("accounting.purchase-invoice.release-hold")
  .input(InputSchema)
  .handler(async ({ id }, ctx) => {
    const [existing] = await ctx.db
      .select()
      .from(accountingPurchaseInvoice)
      .where(eq(accountingPurchaseInvoice.id, id))
      .limit(1);
    if (!existing) {
      throw new Error(`Purchase invoice "${id}" not found.`);
    }
    const [updated] = await ctx.db
      .update(accountingPurchaseInvoice)
      .set({ on_hold: false, updated_at: new Date() })
      .where(eq(accountingPurchaseInvoice.id, id))
      .returning();
    const row = assertUpdated(updated, `Purchase invoice "${id}"`);
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.SALES_ORDER,
        newState: { onHold: false },
      });
    });
    return row;
  });
