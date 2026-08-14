import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../../../db-schemas";

const updateDocumentEscalatedAt = Workflow.name("document.update-escalated-at").handler(
  async (input: { id: string }, ctx): Promise<void> => {
    await ctx.db
      .update(complianceDocument)
      .set({ lastEscalatedAt: new Date(), updatedAt: new Date() })
      .where(eq(complianceDocument.id, input.id));
  },
);

export { updateDocumentEscalatedAt };
