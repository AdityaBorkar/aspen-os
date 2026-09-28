import { productsReorderRule } from "#/db-schemas";
import { REORDER_RULE_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas";
import { assertTransition, reorderRuleLifecycleState } from "#/services/lifecycle";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchReorderRuleStep } from "#/workflow-steps/fetch";
import { runAuditNotifyStep } from "#/workflows/audit";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const IdInputSchema = object({ id: IdSchema });

export const enableReorderRule = Workflow.name("products.reorder-rule.enable")
  .input(IdInputSchema)
  .handler(async ({ id }, ctx) => {
    const current = await ctx.step.run(fetchReorderRuleStep, { id });
    assertTransition("reorder-rule", reorderRuleLifecycleState(current), "enabled");
    const [updated] = await ctx.db
      .update(productsReorderRule)
      .set({ is_disabled: false, updated_at: new Date() })
      .where(eq(productsReorderRule.id, id))
      .returning();
    if (!updated) {
      throw new Error(`Reorder rule with id "${id}" not found.`);
    }
    await runAuditNotifyStep(
      ctx,
      {
        action: AUDIT_ACTION.ENABLED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.REORDER_RULE,
      },
      REORDER_RULE_EVENTS.ENABLED,
      { reorderRuleId: id },
    );
    return updated;
  });
