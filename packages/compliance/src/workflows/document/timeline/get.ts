import { complianceDocument } from "#/db-schemas";
import type { TimelineEntry } from "#/types";
import { ACTIVE_DOCUMENT_STATUSES } from "#/utils/constants";
import { futureDateOnly } from "#/utils/dates";
import { daysUntil } from "#/workflow-steps/status-derivation";
import { requireValidDays } from "#/workflows/document/shared";

import { Workflow } from "@aspen-os/platform/server";
import { and, asc, inArray, isNotNull, lte, or } from "drizzle-orm";

const getDocumentTimeline = Workflow.name("document.timeline").handler(
  async (input: { days: number }, ctx): Promise<TimelineEntry[]> => {
    requireValidDays("days", input.days);
    const futureDateStr = futureDateOnly(input.days);

    const docs = await ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          inArray(complianceDocument.verificationStatus, [...ACTIVE_DOCUMENT_STATUSES]),
          or(
            and(
              isNotNull(complianceDocument.expiryDate),
              lte(complianceDocument.expiryDate, futureDateStr),
            ),
            and(
              isNotNull(complianceDocument.dueDate),
              lte(complianceDocument.dueDate, futureDateStr),
            ),
          ),
        ),
      )
      .orderBy(asc(complianceDocument.expiryDate));

    return docs.map((doc) => {
      const targetDate = doc.expiryDate ?? doc.dueDate;
      const raw = targetDate ? daysUntil(targetDate) : null;
      const daysRemaining = raw === null || Number.isNaN(raw) ? 0 : raw;
      return {
        assignedReviewer: doc.assignedReviewer,
        assignedTo: doc.assignedTo,
        category: doc.category,
        daysRemaining,
        documentType: doc.documentType,
        expiryDate: doc.expiryDate,
        id: doc.id,
        isObligationGenerated: doc.obligationId !== null,
        name: doc.name,
        remindersSent: doc.lastNotifiedAt !== null,
        sourceModule: doc.sourceModule,
        verificationStatus: doc.verificationStatus,
      };
    });
  },
);

export { getDocumentTimeline };
