import { complianceDocument } from "#/db-schemas";
import { VERIFICATION_STATUS } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { asc, inArray } from "drizzle-orm";

const getEscalatableDocuments = Workflow.name("document.escalatable").handler(
  async (_input: Record<string, never>, ctx) =>
    ctx.db
      .select()
      .from(complianceDocument)
      .where(
        inArray(complianceDocument.verificationStatus, [
          VERIFICATION_STATUS.EXPIRED,
          VERIFICATION_STATUS.OVERDUE,
        ]),
      )
      .orderBy(asc(complianceDocument.updatedAt)),
);

export { getEscalatableDocuments };
