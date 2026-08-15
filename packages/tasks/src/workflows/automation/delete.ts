import { automationRule } from "#/db-schemas/automation-rule";
import { IdSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const deleteAutomationRule = Workflow.name("automation.delete")
  .input(object({ id: IdSchema }))
  .handler(async ({ id }, ctx) => {
    await ctx.db.delete(automationRule).where(eq(automationRule.id, id));
  });
