import { productsReorderRule } from "#/db-schemas";
import { IdSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchReorderRuleStep } from "#/workflow-steps/fetch-reorder-rule";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const enableReorderRule = Workflow.name("products.reorder-rule.enable")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    await ctx.step.run(fetchReorderRuleStep, { id });
    const [updated] = await ctx.db
      .update(productsReorderRule)
      .set({ is_disabled: false, updated_at: new Date() })
      .where(eq(productsReorderRule.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Reorder rule with id "${id}" not found.`);
    }
    await ctx.step.run("audit", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ENABLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.REORDER_RULE,
      });
    });
    return updated;
  });
