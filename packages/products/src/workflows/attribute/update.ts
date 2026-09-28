import { productsAttribute } from "#/db-schemas";
import { UpdateAttributeSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchAttributeStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, ne } from "drizzle-orm";
import { object, string } from "valibot";

const UpdateInputSchema = object({ id: string(), patch: UpdateAttributeSchema });

export const updateAttribute = Workflow.name("products.attribute.update")
  .input(UpdateInputSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchAttributeStep, { id: input.id });
    if (input.patch.name !== undefined) {
      const [conflict] = await ctx.db
        .select({ id: productsAttribute.id })
        .from(productsAttribute)
        .where(
          and(eq(productsAttribute.name, input.patch.name), ne(productsAttribute.id, input.id)),
        )
        .limit(1);
      if (conflict) {
        throw new Error(`Attribute "${input.patch.name}" already exists.`);
      }
    }
    const updates = stripUndefined({
      is_disabled: input.patch.isDisabled,
      is_numeric: input.patch.isNumeric,
      name: input.patch.name,
      unit: input.patch.unit,
    });
    const [updated] = await ctx.db
      .update(productsAttribute)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(productsAttribute.id, input.id))
      .returning();
    if (!updated) {
      throw new Error(`Attribute with id "${input.id}" not found.`);
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.UPDATED,
      changes: updates,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.ATTRIBUTE,
    });
    return updated;
  });
