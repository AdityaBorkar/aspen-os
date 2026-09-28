import { productsItemCustomerCode } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const RemoveInputSchema = object({ id: IdSchema });

export const removeCustomerCode = Workflow.name("products.item.customer-code.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id }, ctx) => {
    const [deleted] = await ctx.db
      .delete(productsItemCustomerCode)
      .where(eq(productsItemCustomerCode.id, id))
      .returning({ id: productsItemCustomerCode.id });
    if (!deleted) {
      throw new Error(`Customer code with id "${id}" not found.`);
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
