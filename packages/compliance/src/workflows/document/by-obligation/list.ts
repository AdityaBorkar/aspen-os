import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";

const getDocumentsByObligation = Workflow.name("document.by-obligation").handler(
  async (input: { obligationId: string }, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(eq(complianceDocument.obligation_id, input.obligationId))
      .orderBy(asc(complianceDocument.period_start)),
);

export { getDocumentsByObligation };
