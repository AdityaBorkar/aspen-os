import { Workflow } from "@aspen-os/platform/server";
import { desc, eq } from "drizzle-orm";
import { object } from "valibot";

import { automationRule } from "../db-schemas/automation-rule";
import { IdSchema } from "../types";

export const listAutomationRulesByProject = Workflow.name("automation.list-by-project")
  .input(object({ projectId: IdSchema }))
  .handler(async ({ projectId }, ctx) =>
    ctx.step.run("query", async () => {
      return ctx.db
        .select()
        .from(automationRule)
        .where(eq(automationRule.projectId, projectId))
        .orderBy(desc(automationRule.createdAt));
    }),
  );
