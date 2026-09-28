import { productsItem, productsTemplateAttribute } from "#/db-schemas";
import type { ProductsItem } from "#/db-schemas/item";
import { VARIANT_EVENTS } from "#/pubsub";
import { CreateVariantCombinationsSchema } from "#/schemas";
import { assertItemCodeUnique } from "#/services/item-codes";
import { assertTemplateCreatable } from "#/services/item-invariants";
import {
  buildVariantInsert,
  buildVariantKey,
  expandCombinations,
  variantItemCode,
} from "#/services/variant-values";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const createVariantCombinations = Workflow.name("products.variant.create-combinations")
  .input(CreateVariantCombinationsSchema)
  .handler(async (input, ctx) => {
    const template = await ctx.step.run(fetchItemStep, { id: input.templateItemId });
    assertTemplateCreatable(template);
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
      return { itemCode: variantItemCode(template.item_code, variantKey), variantKey };
    });
    await Promise.all(planned.map(async (entry) => assertItemCodeUnique(ctx.db, entry.itemCode)));
    // One transaction for the whole batch: a failure inserts nothing instead
    // of leaving half the combinations behind.
    const created: ProductsItem[] = await ctx.db.transaction(async (tx) => {
      const values = planned.map((entry) =>
        buildVariantInsert(template, {
          itemCode: entry.itemCode,
          itemName: `${template.item_name} ${entry.variantKey}`,
          manufacturerId: input.manufacturerId,
          variantKey: entry.variantKey,
        }),
      );
      const rows: ProductsItem[] = await tx
        .insert(productsItem)
        .values(values)
        .returning()
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes("already exists")) {
            throw error;
          }
          const codes = planned.map((entry) => entry.itemCode).join(", ");
          throw new Error(`Failed to create variants for item codes [${codes}]: ${message}`, {
            cause: error,
          });
        });
      if (rows.length !== planned.length) {
        throw new Error("Failed to create all variant combinations.");
      }
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
