import { complianceDocument } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const updateDocumentNotifiedAt = Workflow.name("document.update-notified-at").handler(
  async (input: { id: string }, ctx): Promise<void> => {
    await ctx.db
      .update(complianceDocument)
      .set({ lastNotifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(complianceDocument.id, input.id));
  },
);

export { updateDocumentNotifiedAt };
