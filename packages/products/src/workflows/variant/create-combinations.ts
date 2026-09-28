import { productsItem, productsTemplateAttribute } from "#/db-schemas";
import type { ProductsItem } from "#/db-schemas/item";
import { VARIANT_EVENTS } from "#/pubsub";
import { CreateVariantCombinationsSchema } from "#/schemas";
import { assertItemCodeUnique } from "#/services/item-codes";
import { buildVariantInsert, buildVariantKey, expandCombinations } from "#/services/variant-values";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

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
    const planned = combos.map((attributes) => {
      const variantKey = buildVariantKey(attributes);
      const itemCode = `${template.item_code}-${variantKey.replace(/[^A-Za-z0-9]+/g, "-")}`.slice(
        0,
        140,
      );
      return { attributes, itemCode, variantKey };
    });
    await Promise.all(planned.map(async (entry) => assertItemCodeUnique(ctx.db, entry.itemCode)));
    // One transaction for the whole batch: a failure inserts nothing instead
    // of leaving half the combinations behind.
    const created: ProductsItem[] = await ctx.db.transaction(async (tx) => {
      const rows: ProductsItem[] = [];
      // oxlint-disable eslint/no-await-in-loop
      for (const entry of planned) {
        const [variant] = await tx
          .insert(productsItem)
          .values(
            buildVariantInsert(template, {
              itemCode: entry.itemCode,
              itemName: `${template.item_name} ${entry.variantKey}`,
              manufacturerId: input.manufacturerId,
              variantKey: entry.variantKey,
            }),
          )
          .returning();
        if (!variant) {
          throw new Error(`Failed to create variant "${entry.variantKey}".`);
        }
        rows.push(variant);
      }
      // oxlint-enable eslint/no-await-in-loop
      return rows;
    });
    await Promise.all(
      created.map(async (variant) =>
        ctx.pubsub.publish(VARIANT_EVENTS.CREATED, {
          templateItemId: template.id,
          variant: { id: variant.id, itemCode: variant.item_code, variantKey: variant.variant_key },
        }),
      ),
    );
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: template.id,
      entityType: AUDIT_ENTITY_TYPE.VARIANT,
      newState: { count: created.length },
    });
    return created;
  });
