import { productsItem, productsTemplateAttribute } from "#/db-schemas";
import { VARIANT_EVENTS } from "#/pubsub";
import { CreateVariantCombinationsSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch-item";
import { assertItemCodeUnique, buildVariantKey, expandCombinations } from "#/workflows/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const createVariantCombinations = Workflow.name("products.variant.create-combinations")
  .input(CreateVariantCombinationsSchema)
  .handler(async (input, ctx) => {
    const template = await ctx.step.run(fetchItemStep, { id: input.templateItemId });
    if (!template.has_variants) {
      throw new Error("Variants require a template with hasVariants=true.");
    }
    if (template.status !== "active" || template.is_disabled) {
      throw new Error("Cannot create variants from a disabled template.");
    }
    const declared = await ctx.db
      .select({ attributeId: productsTemplateAttribute.attribute_id })
      .from(productsTemplateAttribute)
      .where(eq(productsTemplateAttribute.template_item_id, input.templateItemId));
    if (declared.length === 0) {
      throw new Error("Template declares no attributes. Add template attributes first.");
    }
    const combos = expandCombinations(input.attributeValues);
    if (combos.length === 0) {
      throw new Error("No combinations to create.");
    }
    if (combos.length > 200) {
      throw new Error("Combination explosion limited to 200 variants per call.");
    }
    const created: (typeof template)[] = [];
    // oxlint-disable eslint/no-await-in-loop
    for (const attributes of combos) {
      const variantKey = buildVariantKey(attributes);
      const itemCode = `${template.item_code}-${variantKey.replace(/[^A-Za-z0-9]+/g, "-")}`.slice(
        0,
        140,
      );
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
          item_name: `${template.item_name} ${variantKey}`,
          manufacturer_id: input.manufacturerId ?? template.manufacturer_id,
          template_item_id: template.id,
          variant_based_on: template.variant_based_on,
          variant_key: variantKey,
        })
        .returning();
      if (!variant) {
        throw new Error(`Failed to create variant "${variantKey}".`);
      }
      created.push(variant);
      await ctx.pubsub.publish(VARIANT_EVENTS.CREATED, {
        templateItemId: template.id,
        variant: { id: variant.id, itemCode: variant.item_code, variantKey },
      });
    }
    // oxlint-enable eslint/no-await-in-loop
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: template.id,
        entityType: AUDIT_ENTITY_TYPE.VARIANT,
        newState: { count: created.length },
      });
    });
    return created;
  });
