import { productsAttribute, productsTemplateAttribute } from "#/db-schemas";
import { AddTemplateAttributeSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchItemStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

export const addTemplateAttribute = Workflow.name("products.variant.template-attribute.add")
  .input(AddTemplateAttributeSchema)
  .handler(async (input, ctx) => {
    const template = await ctx.step.run(fetchItemStep, { id: input.templateItemId });
    if (!template.has_variants) {
      throw new Error("Template attributes require a template with hasVariants=true.");
    }
    if (template.has_transactions) {
      throw new Error("Cannot modify template attributes after the first transaction.");
    }
    const [attribute] = await ctx.db
      .select({ id: productsAttribute.id })
      .from(productsAttribute)
      .where(eq(productsAttribute.id, input.attributeId))
      .limit(1);
    if (!attribute) {
      throw new Error(`Attribute with id "${input.attributeId}" not found.`);
    }
    const [existing] = await ctx.db
      .select({ id: productsTemplateAttribute.id })
      .from(productsTemplateAttribute)
      .where(
        and(
          eq(productsTemplateAttribute.template_item_id, input.templateItemId),
          eq(productsTemplateAttribute.attribute_id, input.attributeId),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error("Attribute already declared on this template.");
    }
    const [row] = await ctx.db
      .insert(productsTemplateAttribute)
      .values({
        attribute_id: input.attributeId,
        is_required: input.isRequired ?? true,
        template_item_id: input.templateItemId,
      })
      .returning();
    if (!row) {
      throw new Error("Failed to add template attribute.");
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: row.id,
      entityType: AUDIT_ENTITY_TYPE.VARIANT,
      newState: { attributeId: row.attribute_id, templateItemId: row.template_item_id },
    });
    return row;
  });
