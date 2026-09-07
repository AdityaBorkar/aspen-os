import { complianceDocument } from "#/db-schemas";
import { expiryWindowCondition, requireValidDays } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { asc } from "drizzle-orm";

const getExpiringDocuments = Workflow.name("document.expiring").handler(
  async (input: { days: number }, ctx) => {
    requireValidDays("days", input.days);

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(expiryWindowCondition(input.days))
      .orderBy(asc(complianceDocument.expiryDate));
  },
);

export { getExpiringDocuments };
