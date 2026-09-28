import { productsAttributeValue } from "#/db-schemas";
import { UpdateAttributeValueSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateAttributeValueSchema });

export const updateAttributeValue = Workflow.name("products.attribute.value.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    const updates = stripUndefined({
      range_high: input.patch.rangeHigh,
      range_increment: input.patch.rangeIncrement,
      range_low: input.patch.rangeLow,
      sort_order: input.patch.sortOrder,
      value: input.patch.value,
    });
    const [updated] = await ctx.db
      .update(productsAttributeValue)
      .set(updates)
      .where(eq(productsAttributeValue.id, input.id))
      .returning();
    if (!updated) {
      throw new Error(`Attribute value with id "${input.id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.ATTRIBUTE,
      });
    });
    return updated;
  });
