import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, gte, inArray, isNotNull, lte } from "drizzle-orm";

const getExpiringDocuments = Workflow.name("document.expiring").handler(
  async (input: { days: number }, ctx) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + input.days);
    const futureDateStr = futureDate.toISOString().split("T")[0] as string;
    const todayStr = new Date().toISOString().split("T")[0] as string;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          isNotNull(complianceDocument.expiryDate),
          lte(complianceDocument.expiryDate, futureDateStr),
          gte(complianceDocument.expiryDate, todayStr),
          inArray(complianceDocument.verificationStatus, ["verified", "submitted"]),
        ),
      );
  },
);

export { getExpiringDocuments };
