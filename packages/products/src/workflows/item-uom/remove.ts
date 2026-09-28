import { productsItemUom } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const RemoveInputSchema = object({ id: IdSchema });

export const removeItemUom = Workflow.name("products.item-uom.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id }, ctx) => {
    const [deleted] = await ctx.db
      .delete(productsItemUom)
      .where(eq(productsItemUom.id, id))
      .returning({ id: productsItemUom.id });
    if (!deleted) {
      throw new Error(`Item UOM with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ITEM,
      });
    });
    return { deleted: true };
  });
