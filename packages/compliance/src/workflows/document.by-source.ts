import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";

import { complianceDocument } from "../db-schemas";

const getDocumentsBySource = Workflow.name("document.by-source").handler(
  async (
    input: {
      sourceModule: string;
      sourceEntityType?: string;
      sourceEntityId?: string;
    },
    ctx,
  ) => {
    const conditions = [eq(complianceDocument.sourceModule, input.sourceModule)];

    if (input.sourceEntityType) {
      conditions.push(eq(complianceDocument.sourceEntityType, input.sourceEntityType));
    }
    if (input.sourceEntityId) {
      conditions.push(eq(complianceDocument.sourceEntityId, input.sourceEntityId));
    }

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(and(...conditions))
      .orderBy(desc(complianceDocument.updatedAt));
  },
);

export { getDocumentsBySource };
