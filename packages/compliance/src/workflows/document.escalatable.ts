import { Workflow } from "@aspen-os/platform/server";
import { inArray } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";

const getEscalatableDocuments = Workflow.name("document.escalatable").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(inArray(complianceDocument.verificationStatus, ["expired", "overdue"])),
);

export { getEscalatableDocuments };
