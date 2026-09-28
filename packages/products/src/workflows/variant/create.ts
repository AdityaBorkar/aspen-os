import {
  productsAttribute,
  productsAttributeValue,
  productsItem,
  productsTemplateAttribute,
} from "#/db-schemas";
import { VARIANT_EVENTS } from "#/pubsub";
import { CreateVariantSchema } from "#/schemas";
import { assertItemCodeUnique } from "#/services/item-codes";
import { assertManufacturerVariant, assertTemplateCreatable } from "#/services/item-invariants";
import { buildVariantInsert, buildVariantKey, variantItemCode } from "#/services/variant-values";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import type { WorkflowContext } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";

export const createVariant = Workflow.name("products.variant.create")
  .input(CreateVariantSchema)
  .handler(async (input, ctx) => {
    const template = await ctx.step.run(fetchItemStep, { id: input.templateItemId });
    assertTemplateCreatable(template);

    const declared = await ctx.db
      .select({
        attributeId: productsTemplateAttribute.attribute_id,
        isRequired: productsTemplateAttribute.is_required,
      })
      .from(productsTemplateAttribute)
      .where(eq(productsTemplateAttribute.template_item_id, input.templateItemId));

    const basedOn = template.variant_based_on ?? "attribute";
    if (basedOn === "attribute") {
      const requiredIds = declared.filter((row) => row.isRequired).map((row) => row.attributeId);
      if (requiredIds.length > 0) {
        const requiredAttrs = await ctx.db
          .select({ id: productsAttribute.id, name: productsAttribute.name })
          .from(productsAttribute)
          .where(inArray(productsAttribute.id, requiredIds));
        const nameById = new Map(requiredAttrs.map((row) => [row.id, row.name]));
        for (const id of requiredIds) {
          const name = nameById.get(id) ?? id;
          if (input.attributes[name] === undefined) {
            throw new Error(`Missing required attribute "${name}".`);
          }
        }
      }
      await assertAttributeValuesAllowed(ctx.db, input.attributes);
    } else {
      assertManufacturerVariant({
        manufacturerId: input.manufacturerId,
        manufacturerPartNo: input.manufacturerPartNo,
        variantBasedOn: basedOn,
      });
    }

    const variantKey = buildVariantKey(input.attributes);
    const baseCode = input.itemName?.trim() || variantItemCode(template.item_code, variantKey);
    const itemCode = baseCode.slice(0, 140);
    await assertItemCodeUnique(ctx.db, itemCode);

    const [variant] = await ctx.db
      .insert(productsItem)
      .values(
        buildVariantInsert(template, {
          itemCode,
          itemName: input.itemName?.trim() || `${template.item_name} ${variantKey}`,
          manufacturerId: input.manufacturerId,
          manufacturerPartNo: input.manufacturerPartNo,
          variantKey,
        }),
      )
      .returning();

    if (!variant) {
      throw new Error("Failed to create variant.");
    }

    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: variant.id,
        entityType: AUDIT_ENTITY_TYPE.VARIANT,
        newState: { itemCode: variant.item_code, templateItemId: template.id, variantKey },
      },
      VARIANT_EVENTS.CREATED,
      {
        templateItemId: template.id,
        variant: { id: variant.id, itemCode: variant.item_code, variantKey },
      },
    );

    return variant;
  });

/**
 * Validate every supplied attribute name/value pair with two batched queries
 * instead of one query pair per attribute.
 */
async function assertAttributeValuesAllowed(
  db: WorkflowContext["db"],
  attributes: Record<string, string>,
): Promise<void> {
  const names = Object.keys(attributes);
  if (names.length === 0) {
    return;
  }
  const found = await db
    .select({
      id: productsAttribute.id,
      isNumeric: productsAttribute.is_numeric,
      name: productsAttribute.name,
    })
    .from(productsAttribute)
    .where(inArray(productsAttribute.name, names));
  const byName = new Map(found.map((row) => [row.name, row]));
  for (const name of names) {
    if (!byName.has(name)) {
      throw new Error(`Attribute "${name}" not found.`);
    }
  }
  const valued = names.flatMap((name) => {
    const attribute = byName.get(name);
    const value = attributes[name];
    if (attribute === undefined || attribute.isNumeric || value === undefined) {
      return [];
    }
    return [{ attributeId: attribute.id, name, value }];
  });
  if (valued.length === 0) {
    return;
  }
  const allowed = await db
    .select({
      attributeId: productsAttributeValue.attribute_id,
      value: productsAttributeValue.value,
    })
    .from(productsAttributeValue)
    .where(
      and(
        inArray(
          productsAttributeValue.attribute_id,
          valued.map((entry) => entry.attributeId),
        ),
        inArray(
          productsAttributeValue.value,
          valued.map((entry) => entry.value),
        ),
      ),
    );
  const allowedSet = new Set(allowed.map((row) => `${row.attributeId}|${row.value}`));
  for (const entry of valued) {
    if (!allowedSet.has(`${entry.attributeId}|${entry.value}`)) {
      throw new Error(`Value "${entry.value}" is not allowed for attribute "${entry.name}".`);
    }
  }
}
