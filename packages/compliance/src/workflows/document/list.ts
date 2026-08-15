import { complianceDocument } from "#/db-schemas";
import { ComplianceDocumentFiltersSchema } from "#/types";
import type { ComplianceDocumentFilters } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq, isNotNull, lte } from "drizzle-orm";
import { parse } from "valibot";

const listDocuments = Workflow.name("document.list").handler(
  async (input: { filters?: ComplianceDocumentFilters }, ctx) => {
    const { filters } = input;
    const parsed = filters ? parse(ComplianceDocumentFiltersSchema, filters) : {};
    const conditions = [];

    if (parsed.category) {
      conditions.push(eq(complianceDocument.category, parsed.category));
    }
    if (parsed.verificationStatus) {
      conditions.push(eq(complianceDocument.verificationStatus, parsed.verificationStatus));
    }
    if (parsed.branch) {
      conditions.push(eq(complianceDocument.branch, parsed.branch));
    }
    if (parsed.sourceModule) {
      conditions.push(eq(complianceDocument.sourceModule, parsed.sourceModule));
    }
    if (parsed.sourceEntityType) {
      conditions.push(eq(complianceDocument.sourceEntityType, parsed.sourceEntityType));
    }
    if (parsed.sourceEntityId) {
      conditions.push(eq(complianceDocument.sourceEntityId, parsed.sourceEntityId));
    }
    if (parsed.reviewer) {
      conditions.push(eq(complianceDocument.assignedReviewer, parsed.reviewer));
    }
    if (parsed.obligationId) {
      conditions.push(eq(complianceDocument.obligationId, parsed.obligationId));
    }
    if (parsed.jurisdiction) {
      conditions.push(eq(complianceDocument.jurisdiction, parsed.jurisdiction));
    }
    if (parsed.expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parsed.expiringWithinDays);
      const futureDateStr = futureDate.toISOString().split("T")[0]!;
      conditions.push(
        and(
          isNotNull(complianceDocument.expiryDate),
          lte(complianceDocument.expiryDate, futureDateStr),
        ),
      );
    }
    if (parsed.dueWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parsed.dueWithinDays);
      const futureDateStr = futureDate.toISOString().split("T")[0]!;
      conditions.push(
        and(isNotNull(complianceDocument.dueDate), lte(complianceDocument.dueDate, futureDateStr)),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(whereClause)
      .orderBy(desc(complianceDocument.updatedAt));
  },
);

export { listDocuments };
