import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, inArray, isNotNull, isNull, lte } from "drizzle-orm";

const getOverdueDocuments = Workflow.name("document.overdue").handler(
  async (_input: Record<string, never>, ctx) => {
    const todayStr = new Date().toISOString().split("T")[0]!;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.dueDate),
          lte(complianceDocument.dueDate, todayStr),
          isNull(complianceDocument.completedAt),
          inArray(complianceDocument.verificationStatus, [
            "draft",
            "submitted",
            "under_review",
            "verified",
          ]),
        ),
      );
  },
);

export { getOverdueDocuments };
