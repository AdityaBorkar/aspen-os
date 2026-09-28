import { productsItem } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const disableVariant = Workflow.name("products.variant.disable")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchItemStep, { id });
    if (!current.template_item_id) {
      throw new Error(`Item with id "${id}" is not a variant.`);
    }
    const [updated] = await ctx.db
      .update(productsItem)
      .set({ is_disabled: true, status: "disabled", updated_at: new Date() })
      .where(eq(productsItem.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Variant with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DISABLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.VARIANT,
      });
    });
    return updated;
  });
