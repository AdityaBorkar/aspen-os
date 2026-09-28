import { productsItemUom } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemUomStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { nullable, number, object, optional, string } from "valibot";

const RecalculateInputSchema = object({
  conversionFactor: number(),
  id: IdSchema,
  reason: optional(nullable(string())),
});

export const recalculateItemUom = Workflow.name("products.item-uom.recalculate")
  .input(RecalculateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchItemUomStep, { id: input.id });
    if (input.conversionFactor <= 0) {
      throw new Error("conversionFactor must be greater than zero.");
    }
    const [row] = await ctx.db
      .update(productsItemUom)
      .set({ conversion_factor: input.conversionFactor, updated_at: new Date() })
      .where(eq(productsItemUom.id, input.id))
      .returning();
    if (!row) {
      throw new Error(`Item UOM with id "${input.id}" not found.`);
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.RECALCULATED,
      crudAction: "update",
      entityId: row.id,
      entityType: AUDIT_ENTITY_TYPE.ITEM_UOM,
      newState: { conversionFactor: row.conversion_factor },
    });
    return row;
  });
