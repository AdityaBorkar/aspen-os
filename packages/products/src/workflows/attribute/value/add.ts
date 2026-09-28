import { productsAttributeValue } from "#/db-schemas";
import { AddAttributeValueSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAttributeStep } from "#/workflow-steps/fetch-attribute";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const addAttributeValue = Workflow.name("products.attribute.value.add")
  .input(AddAttributeValueSchema)
  .handler(async (input, ctx) => {
    const attribute = await ctx.step.run(fetchAttributeStep, { id: input.attributeId });
    if (attribute.is_numeric) {
      if (input.rangeLow === undefined || input.rangeHigh === undefined) {
        throw new Error("Numeric attributes require range_low and range_high.");
      }
      if ((input.rangeLow ?? 0) > (input.rangeHigh ?? 0)) {
        throw new Error("range_low must be less than or equal to range_high.");
      }
    }
    const [existing] = await ctx.db
      .select({ id: productsAttributeValue.id })
      .from(productsAttributeValue)
      .where(
        and(
          eq(productsAttributeValue.attribute_id, input.attributeId),
          eq(productsAttributeValue.value, input.value),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error(`Value "${input.value}" already exists for this attribute.`);
    }
    const [row] = await ctx.db
      .insert(productsAttributeValue)
      .values({
        attribute_id: input.attributeId,
        range_high: input.rangeHigh ?? null,
        range_increment: input.rangeIncrement ?? null,
        range_low: input.rangeLow ?? null,
        sort_order: input.sortOrder ?? 0,
        value: input.value,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add attribute value.");
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.ATTRIBUTE,
        newState: { attributeId: row.attribute_id, value: row.value },
      });
    });
    return row;
  });
