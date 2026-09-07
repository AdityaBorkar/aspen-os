import { complianceDocument } from "#/db-schemas";
import { expiredCondition } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";

const getExpiredDocuments = Workflow.name("document.expired").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(expiredCondition())
      .orderBy(asc(complianceDocument.expiryDate)),
);

export { getExpiredDocuments };
