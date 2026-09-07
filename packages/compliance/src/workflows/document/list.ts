import { complianceDocument } from "#/db-schemas";
import { ComplianceDocumentFiltersSchema } from "#/schemas";
import type { ComplianceDocumentFilters } from "#/schemas";
import { futureDateOnly } from "#/utils/dates";
import { assertNonNegativeInt, requireValidDays } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { parse } from "valibot";

const listDocuments = Workflow.name("document.list").handler(
  async (input: { filters?: ComplianceDocumentFilters; limit?: number; offset?: number }, ctx) => {
    const { filters, limit, offset } = input;
    const parsed = filters ? parse(ComplianceDocumentFiltersSchema, filters) : {};
    requireValidDays("expiringWithinDays", parsed.expiringWithinDays);
    requireValidDays("dueWithinDays", parsed.dueWithinDays);
    assertNonNegativeInt("limit", limit);
    assertNonNegativeInt("offset", offset);
    const conditions = [];

    if (parsed.category) {
      conditions.push(eq(complianceDocument.category, parsed.category));
    }
    if (parsed.verificationStatus) {
      conditions.push(eq(complianceDocument.verificationStatus, parsed.verificationStatus));
    }
    if (parsed.statuses && parsed.statuses.length > 0) {
      conditions.push(inArray(complianceDocument.verificationStatus, [...parsed.statuses]));
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
    const reviewer = parsed.reviewer ?? parsed.assignedReviewer;
    if (reviewer) {
      conditions.push(eq(complianceDocument.assignedReviewer, reviewer));
    }
    if (parsed.obligationId) {
      conditions.push(eq(complianceDocument.obligationId, parsed.obligationId));
    }
    if (parsed.jurisdiction) {
      conditions.push(eq(complianceDocument.jurisdiction, parsed.jurisdiction));
    }
    if (parsed.expiringWithinDays !== undefined) {
      const futureDateStr = futureDateOnly(parsed.expiringWithinDays);
      conditions.push(
        and(
          isNotNull(complianceDocument.expiryDate),
          lte(complianceDocument.expiryDate, futureDateStr),
        ),
      );
    }
    if (parsed.dueWithinDays !== undefined) {
      const futureDateStr = futureDateOnly(parsed.dueWithinDays);
      conditions.push(
        and(isNotNull(complianceDocument.dueDate), lte(complianceDocument.dueDate, futureDateStr)),
      );
    }
    if (parsed.requireCompletedAtNull) {
      conditions.push(isNull(complianceDocument.completedAt));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderBy = desc(complianceDocument.updatedAt);
    if (parsed.orderBy === "periodStartAsc") {
      orderBy = asc(complianceDocument.periodStart);
    } else if (parsed.orderBy === "expiryAsc") {
      orderBy = asc(complianceDocument.expiryDate);
    }

    let query = ctx.db
      .select()
      .from(complianceDocument)
      .where(whereClause)
      .orderBy(orderBy)
      .$dynamic();

    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.offset(offset);
    }

    return query;
  },
);

export { listDocuments };
