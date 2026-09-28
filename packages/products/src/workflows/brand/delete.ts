import { productsBrand, productsItem } from "#/db-schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchBrandStep } from "#/workflow-steps/fetch-brand";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const DeleteInputSchema = object({ id: string() });

export const deleteBrand = Workflow.name("products.brand.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchBrandStep, { id });

    const [referenced] = await ctx.db
      .select({ id: productsItem.id })
      .from(productsItem)
      .where(eq(productsItem.brand_id, id))
      .limit(1);
    if (referenced) {
      throw new Error("Cannot delete brand while items reference it. Disable it instead.");
    }

    const [deleted] = await ctx.db
      .delete(productsBrand)
      .where(eq(productsBrand.id, id))
      .returning({ id: productsBrand.id });

    if (!deleted) {
      throw new Error(`Brand with id "${id}" not found.`);
    }

    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.BRAND,
      });
    });

    return { deleted: true };
  });
