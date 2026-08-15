import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, inArray, isNotNull, or } from "drizzle-orm";

const getActiveDocumentsForReminders = Workflow.name("document.active-for-reminders").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          inArray(complianceDocument.verificationStatus, [
            "verified",
            "submitted",
            "under_review",
            "draft",
          ]),
          or(isNotNull(complianceDocument.expiryDate), isNotNull(complianceDocument.dueDate)),
        ),
      ),
);

export { getActiveDocumentsForReminders };
