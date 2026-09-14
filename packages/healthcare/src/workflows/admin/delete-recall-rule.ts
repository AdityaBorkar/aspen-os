import { healthcareRecallRule } from "#/db-schemas/admin";
import { RecallRuleIdSchema } from "#/schemas/admin";
import { AUDIT_ACTION } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const DeleteRecallRuleInputSchema = object({ input: RecallRuleIdSchema });

export const deleteRecallRule = Workflow.name("healthcare.admin.delete-recall-rule")
  .input(DeleteRecallRuleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecallRuleIdSchema, input);
    await ctx.step.run("fetch-recall-rule", async () => {
      const [row] = await ctx.db
        .select({ branch_id: healthcareRecallRule.branch_id })
        .from(healthcareRecallRule)
        .where(eq(healthcareRecallRule.id, parsed.id))
        .limit(1);
      if (!row) {
        throw new Error(`Recall rule "${parsed.id}" not found.`);
      }
      return row;
    });
    const [row] = await ctx.step.run("delete-recall-rule", async () =>
      ctx.db
        .update(healthcareRecallRule)
        .set({ status: "deleted" })
        .where(eq(healthcareRecallRule.id, parsed.id))
        .returning(),
    );
    if (!row) {
      throw new Error(`Failed to delete recall rule "${parsed.id}".`);
    }
    await ctx.step.run("audit-recall-rule", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: row.id,
        entityType: "healthcare:recall-rule",
        newState: { id: row.id, status: row.status },
      });
    });
    return { id: row.id, status: row.status };
  });
