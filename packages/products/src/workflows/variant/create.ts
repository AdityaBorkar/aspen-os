import {
  productsAttribute,
  productsAttributeValue,
  productsItem,
  productsTemplateAttribute,
} from "#/db-schemas";
import { VARIANT_EVENTS } from "#/pubsub";
import { CreateVariantSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";
import { assertItemCodeUnique, buildVariantKey } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, inArray } from "drizzle-orm";

export const createVariant = Workflow.name("products.variant.create")
  .input(CreateVariantSchema)
  .handler(async (input, ctx) => {
    const template = await ctx.step.run(fetchItemStep, { id: input.templateItemId });
    if (!template.has_variants) {
      throw new Error("Variants require a template with hasVariants=true.");
    }
    if (template.status !== "active" || template.is_disabled) {
      throw new Error("Cannot create variants from a disabled template.");
    }

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
      const attributeNames = await ctx.db
        .select({ id: productsAttribute.id, name: productsAttribute.name })
        .from(productsAttribute)
        .where(
          requiredIds.length > 0
            ? inArray(productsAttribute.id, requiredIds)
            : eq(productsAttribute.id, "__never__"),
        );
      const nameById = new Map(attributeNames.map((row) => [row.id, row.name]));
      const requiredNames = requiredIds.map((id) => nameById.get(id) ?? id);
      for (const name of requiredNames) {
        if (input.attributes[name] === undefined) {
          throw new Error(`Missing required attribute "${name}".`);
        }
      }
      for (const [name, value] of Object.entries(input.attributes)) {
        const [attribute] = await ctx.db
          .select({ id: productsAttribute.id, isNumeric: productsAttribute.is_numeric })
          .from(productsAttribute)
          .where(eq(productsAttribute.name, name))
          .limit(1);
        if (!attribute) {
          throw new Error(`Attribute "${name}" not found.`);
        }
        if (!attribute.isNumeric) {
          const [allowed] = await ctx.db
            .select({ id: productsAttributeValue.id })
            .from(productsAttributeValue)
            .where(
              and(
                eq(productsAttributeValue.attribute_id, attribute.id),
                eq(productsAttributeValue.value, value),
              ),
            )
            .limit(1);
          if (!allowed) {
            throw new Error(`Value "${value}" is not allowed for attribute "${name}".`);
          }
        }
      }
    } else {
      if (!input.manufacturerId && !input.manufacturerPartNo) {
        throw new Error(
          "Manufacturer-based variants require manufacturerId or manufacturerPartNo.",
        );
      }
    }

    const variantKey = buildVariantKey(input.attributes);
    const baseCode =
      input.itemName?.trim() ||
      `${template.item_code}-${variantKey.replace(/[^A-Za-z0-9]+/g, "-")}`;
    const itemCode = baseCode.slice(0, 140);
    await assertItemCodeUnique(ctx.db, itemCode);

    const [variant] = await ctx.db
      .insert(productsItem)
      .values({
        brand_id: template.brand_id,
        default_cost_center: template.default_cost_center,
        default_expense_account: template.default_expense_account,
        default_income_account: template.default_income_account,
        default_material_request_type: template.default_material_request_type,
        default_price_list: template.default_price_list,
        default_purchase_uom: template.default_purchase_uom,
        default_sales_uom: template.default_sales_uom,
        default_supplier_id: template.default_supplier_id,
        default_uom: template.default_uom,
        default_warehouse_id: template.default_warehouse_id,
        description: template.description,
        is_purchase_item: template.is_purchase_item,
        is_sales_item: template.is_sales_item,
        is_stock_item: template.is_stock_item,
        item_code: itemCode,
        item_group_id: template.item_group_id,
        item_name: input.itemName?.trim() || `${template.item_name} ${variantKey}`,
        manufacturer_id: input.manufacturerId ?? template.manufacturer_id,
        manufacturer_part_no: input.manufacturerPartNo ?? null,
        template_item_id: template.id,
        variant_based_on: template.variant_based_on,
        variant_key: variantKey,
      })
      .returning();

    if (!variant) {
      throw new Error("Failed to create variant.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: variant.id,
        entityType: AUDIT_ENTITY_TYPE.VARIANT,
        newState: { itemCode: variant.item_code, templateItemId: template.id, variantKey },
      });
      await ctx.pubsub.publish(VARIANT_EVENTS.CREATED, {
        templateItemId: template.id,
        variant: { id: variant.id, itemCode: variant.item_code, variantKey },
      });
    });

    return variant;
  });
