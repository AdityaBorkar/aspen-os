import { complianceDocument } from "#/db-schemas";
import { activeWithDateCondition } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { desc } from "drizzle-orm";

const getActiveDocumentsForReminders = Workflow.name("document.active-for-reminders").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(activeWithDateCondition())
      .orderBy(desc(complianceDocument.updatedAt)),
);

export { getActiveDocumentsForReminders };
