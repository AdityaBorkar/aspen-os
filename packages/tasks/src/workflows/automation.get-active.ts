import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { object, string } from "valibot";

import { automationRule } from "../db-schemas/automation-rule";
import { IdSchema } from "../types";
import type { AutomationTrigger } from "../utils/constants";

export const getActiveAutomationRules = Workflow.name("automation.get-active")
  .input(object({ projectId: IdSchema, trigger: string() }))
  .handler(async ({ projectId, trigger }, ctx) =>
    ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(automationRule)
        .where(
          and(
            eq(automationRule.projectId, projectId),
            eq(automationRule.trigger, trigger as AutomationTrigger),
            eq(automationRule.isActive, true),
          ),
        );
    }),
  );
