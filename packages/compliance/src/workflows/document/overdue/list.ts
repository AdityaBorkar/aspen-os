import { complianceDocument } from "#/db-schemas";
import { overdueCondition } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";

const getOverdueDocuments = Workflow.name("document.overdue").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(overdueCondition())
      .orderBy(asc(complianceDocument.dueDate)),
);

export { getOverdueDocuments };
