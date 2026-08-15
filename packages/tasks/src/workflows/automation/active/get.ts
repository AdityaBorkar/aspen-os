import { automationRule } from "#/db-schemas/automation-rule";
import { IdSchema } from "#/types";
import { isAutomationTrigger } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

export const getActiveAutomationRules = Workflow.name("automation.get-active")
  .input(object({ projectId: IdSchema, trigger: string() }))
  .handler(async ({ projectId, trigger }, ctx) => {
    if (!isAutomationTrigger(trigger)) {
      return [];
    }

    return ctx.step.run("query", async () =>
      ctx.db
        .select()
        .from(automationRule)
        .where(
          and(
            eq(automationRule.projectId, projectId),
            eq(automationRule.trigger, trigger),
            eq(automationRule.isActive, true),
          ),
        ),
    );
  });
