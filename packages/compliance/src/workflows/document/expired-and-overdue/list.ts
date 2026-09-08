import { complianceDocument } from "#/db-schemas";
import { expiredOrOverdueCondition } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { desc } from "drizzle-orm";

const getExpiredAndOverdueDocuments = Workflow.name("document.expired-and-overdue").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(expiredOrOverdueCondition())
      .orderBy(desc(complianceDocument.updated_at)),
);

export { getExpiredAndOverdueDocuments };
