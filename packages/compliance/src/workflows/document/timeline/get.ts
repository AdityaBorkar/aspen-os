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
          inArray(complianceDocument.verification_status, [...ACTIVE_DOCUMENT_STATUSES]),
          or(
            and(
              isNotNull(complianceDocument.expiry_date),
              lte(complianceDocument.expiry_date, futureDateStr),
            ),
            and(
              isNotNull(complianceDocument.due_date),
              lte(complianceDocument.due_date, futureDateStr),
            ),
          ),
        ),
      )
      .orderBy(asc(complianceDocument.expiry_date));

    return docs.map((doc) => {
      const targetDate = doc.expiry_date ?? doc.due_date;
      const daysRemaining = targetDate ? (daysUntil(targetDate) ?? 0) : 0;
      return {
        assignedReviewer: doc.assigned_reviewer,
        assignedTo: doc.assigned_to,
        category: doc.category,
        daysRemaining,
        documentType: doc.document_type,
        expiryDate: doc.expiry_date,
        id: doc.id,
        isObligationGenerated: doc.obligation_id !== null,
        name: doc.name,
        remindersSent: doc.last_notified_at !== null,
        sourceModule: doc.source_module,
        verificationStatus: doc.verification_status,
      };
    });
  },
);

export { getDocumentTimeline };
