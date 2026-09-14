import { healthcareRecallRule } from "#/db-schemas/admin";
import { SaveRecallRuleSchema } from "#/schemas/admin";
import { AUDIT_ACTION } from "#/utils/constants";
import { toRecallRuleDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const SaveRecallRuleInputSchema = object({ input: SaveRecallRuleSchema });

export const saveRecallRule = Workflow.name("healthcare.admin.save-recall-rule")
  .input(SaveRecallRuleInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(SaveRecallRuleSchema, input);
    const branchId = parsed.branchId ?? "main";
    const [row] = await ctx.step.run("insert-recall-rule", async () =>
      ctx.db
        .insert(healthcareRecallRule)
        .values({
          branch_id: branchId,
          days_after: parsed.daysAfter,
          id: crypto.randomUUID(),
          message: parsed.message,
          name: parsed.name,
          status: "active",
        })
        .returning(),
    );
    if (!row) {
      throw new Error("Failed to save recall rule.");
    }
    await ctx.step.run("audit-recall-rule", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: "healthcare:recall-rule",
        newState: { id: row.id, name: row.name },
      });
    });
    return toRecallRuleDto(row);
  });
