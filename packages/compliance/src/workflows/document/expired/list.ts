import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, inArray, isNotNull, lte } from "drizzle-orm";

const getExpiredDocuments = Workflow.name("document.expired").handler(
  async (_input: Record<string, never>, ctx) => {
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.expiryDate),
          lte(complianceDocument.expiryDate, todayStr),
          inArray(complianceDocument.verificationStatus, ["verified", "submitted", "under_review"]),
        ),
      );
  },
);

export { getExpiredDocuments };
