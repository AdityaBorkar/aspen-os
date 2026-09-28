import { productsAttributeValue } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const RemoveInputSchema = object({ id: IdSchema });

export const removeAttributeValue = Workflow.name("products.attribute.value.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id }, ctx) => {
    const [deleted] = await ctx.db
      .delete(productsAttributeValue)
      .where(eq(productsAttributeValue.id, id))
      .returning({ id: productsAttributeValue.id });
    if (!deleted) {
      throw new Error(`Attribute value with id "${id}" not found.`);
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.ATTRIBUTE,
    });
    return { deleted: true };
  });
