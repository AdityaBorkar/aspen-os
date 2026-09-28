import { productsAttribute, productsAttributeValue, productsTemplateAttribute } from "#/db-schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchAttributeStep } from "#/workflow-steps/fetch-attribute";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const DeleteInputSchema = object({ id: string() });

export const deleteAttribute = Workflow.name("products.attribute.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchAttributeStep, { id });
    const [valueRef] = await ctx.db
      .select({ id: productsAttributeValue.id })
      .from(productsAttributeValue)
      .where(eq(productsAttributeValue.attribute_id, id))
      .limit(1);
    if (valueRef) {
      throw new Error("Cannot delete attribute while values reference it.");
    }
    const [templateRef] = await ctx.db
      .select({ id: productsTemplateAttribute.id })
      .from(productsTemplateAttribute)
      .where(eq(productsTemplateAttribute.attribute_id, id))
      .limit(1);
    if (templateRef) {
      throw new Error("Cannot delete attribute while templates reference it.");
    }
    const [deleted] = await ctx.db
      .delete(productsAttribute)
      .where(eq(productsAttribute.id, id))
      .returning({ id: productsAttribute.id });
    if (!deleted) {
      throw new Error(`Attribute with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ATTRIBUTE,
      });
    });
    return { deleted: true };
  });
