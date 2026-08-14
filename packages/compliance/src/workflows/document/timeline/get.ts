import { Workflow } from "@aspen-os/platform/server";
import { and, asc, inArray, isNotNull, lte, or } from "drizzle-orm";

import { complianceDocument } from "../../../db-schemas";
import { daysUntil } from "../../../services/status-derivation";
import type { TimelineEntry } from "../../../types";

const getDocumentTimeline = Workflow.name("document.timeline").handler(
  async (input: { days: number }, ctx): Promise<TimelineEntry[]> => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + input.days);
    const futureDateStr = futureDate.toISOString().split("T")[0] as string;

    const docs = await ctx.db
      .select()
      .from(complianceDocument)
      .where(
        and(
          inArray(complianceDocument.verificationStatus, [
            "verified",
            "submitted",
            "under_review",
            "draft",
          ]),
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
      const daysRemaining = targetDate ? (daysUntil(targetDate) ?? 0) : 0;
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
