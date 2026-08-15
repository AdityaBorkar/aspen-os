import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, gte, isNotNull, isNull, lte } from "drizzle-orm";

const getDueSoonDocuments = Workflow.name("document.due-soon").handler(
  async (input: { days: number }, ctx) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + input.days);
    const futureDateStr = futureDate.toISOString().split("T")[0]!;
    const todayStr = new Date().toISOString().split("T")[0]!;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.dueDate),
          lte(complianceDocument.dueDate, futureDateStr),
          gte(complianceDocument.dueDate, todayStr),
          isNull(complianceDocument.completedAt),
        ),
      );
  },
);

export { getDueSoonDocuments };
