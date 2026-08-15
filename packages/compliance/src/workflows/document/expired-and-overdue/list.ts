import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { inArray } from "drizzle-orm";

const getExpiredAndOverdueDocuments = Workflow.name("document.expired-and-overdue").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(
        inArray(complianceDocument.verificationStatus, [
          "verified",
          "submitted",
          "under_review",
          "draft",
        ]),
      ),
);

export { getExpiredAndOverdueDocuments };
