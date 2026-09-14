import { healthcareRecallRule } from "#/db-schemas/admin";
import { RecallRuleFiltersSchema } from "#/schemas/admin";
import { toRecallRuleDto } from "#/workflow-steps/fetch-admin";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { object, parse } from "valibot";

const ListRecallRulesInputSchema = object({ input: RecallRuleFiltersSchema });

export const listRecallRules = Workflow.name("healthcare.admin.list-recall-rules")
  .input(ListRecallRulesInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RecallRuleFiltersSchema, input);
    const rows = await ctx.step.run("list-recall-rules", async () => {
      const conditions: SQL[] = [eq(healthcareRecallRule.status, "active")];
      if (parsed.branchId) {
        conditions.push(eq(healthcareRecallRule.branch_id, parsed.branchId));
      }
      return ctx.db
        .select()
        .from(healthcareRecallRule)
        .where(and(...conditions))
        .orderBy(desc(healthcareRecallRule.created_at))
        .limit(parsed.limit ?? 100)
        .offset(parsed.offset ?? 0);
    });
    return rows.map(toRecallRuleDto);
  });
