import { productsReorderRule } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchReorderRuleStep } from "#/workflow-steps/fetch";
import { runAuditStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeleteInputSchema = object({ id: IdSchema });

export const deleteReorderRule = Workflow.name("products.reorder-rule.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchReorderRuleStep, { id });
    const [deleted] = await ctx.db
      .delete(productsReorderRule)
      .where(eq(productsReorderRule.id, id))
      .returning({ id: productsReorderRule.id });
    if (!deleted) {
      throw new Error(`Reorder rule with id "${id}" not found.`);
    }
    await runAuditStep(ctx, {
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.REORDER_RULE,
    });
    return { deleted: true };
  });
