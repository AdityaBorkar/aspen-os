import { automationRule } from "#/db-schemas/automation-rule";
import { AutomationTriggerSchema } from "#/schemas/enums";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, safeParse, string } from "valibot";

export const getActiveAutomationRules = Workflow.name("automation.get-active")
  .input(object({ projectId: IdSchema, trigger: string() }))
  .handler(async ({ projectId, trigger }, ctx) => {
    const parsedTrigger = safeParse(AutomationTriggerSchema, trigger);
    if (!parsedTrigger.success) {
      return [];
    }

    return ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(automationRule)
        .where(
          and(
            eq(automationRule.project_id, projectId),
            eq(automationRule.trigger, parsedTrigger.output),
            eq(automationRule.is_active, true),
          ),
        ),
    );
  });
