import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";

const getDocumentsBySource = Workflow.name("document.by-source").handler(
  async (
    input: {
      sourceModule: string;
      sourceEntityType?: string;
      sourceEntityId?: string;
    },
    ctx,
  ) => {
    const conditions = [eq(complianceDocument.source_module, input.sourceModule)];

    if (input.sourceEntityType) {
      conditions.push(eq(complianceDocument.source_entity_type, input.sourceEntityType));
    }
    if (input.sourceEntityId) {
      conditions.push(eq(complianceDocument.source_entity_id, input.sourceEntityId));
    }

    return ctx.db
      .select()
      .from(complianceDocument)
      .where(and(...conditions))
      .orderBy(desc(complianceDocument.updated_at));
  },
);

export { getDocumentsBySource };
