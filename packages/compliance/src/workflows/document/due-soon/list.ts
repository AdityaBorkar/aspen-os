import { complianceDocument } from "#/db-schemas";
import { dueWindowCondition, requireValidDays } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";

const getDueSoonDocuments = Workflow.name("document.due-soon").handler(
  async (input: { days: number }, ctx) => {
    requireValidDays("days", input.days);

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(dueWindowCondition(input.days))
      .orderBy(asc(complianceDocument.due_date));
  },
);

export { getDueSoonDocuments };
