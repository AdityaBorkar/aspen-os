import { productsItemAlternative } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const RemoveInputSchema = object({ id: IdSchema });

export const removeAlternative = Workflow.name("products.alternative.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id }, ctx) => {
    const [deleted] = await ctx.db
      .delete(productsItemAlternative)
      .where(eq(productsItemAlternative.id, id))
      .returning({ id: productsItemAlternative.id });
    if (!deleted) {
      throw new Error(`Alternative with id "${id}" not found.`);
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
