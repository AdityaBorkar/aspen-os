import { productsTemplateAttribute } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const RemoveInputSchema = object({ id: IdSchema });

export const removeTemplateAttribute = Workflow.name("products.variant.template-attribute.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id }, ctx) => {
    const [deleted] = await ctx.db
      .delete(productsTemplateAttribute)
      .where(eq(productsTemplateAttribute.id, id))
      .returning({ id: productsTemplateAttribute.id });
    if (!deleted) {
      throw new Error(`Template attribute with id "${id}" not found.`);
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.VARIANT,
    });
    return { deleted: true };
  });
