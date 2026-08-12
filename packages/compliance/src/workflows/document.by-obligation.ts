import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";

const getDocumentsByObligation = Workflow.name(
  "document.by-obligation",
).handler(async (input: { obligationId: string }, ctx) => {
  return ctx.db
    .select()
    .from(complianceDocument)
    .where(eq(complianceDocument.obligationId, input.obligationId))
    .orderBy(asc(complianceDocument.periodStart));
});

export { getDocumentsByObligation };
