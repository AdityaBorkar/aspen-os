import { complianceDocument } from "#/db-schemas";
import { fetchDocumentStep } from "#/workflow-steps/fetch-document";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

const updateDocumentNotifiedAt = Workflow.name("document.update-notified-at").handler(
  async (input: { id: string }, ctx): Promise<void> => {
    await ctx.step.run(fetchDocumentStep, { id: input.id });
    const now = new Date();
    await ctx.db
      .update(complianceDocument)
      .set({ last_notified_at: now, updated_at: now })
      .where(eq(complianceDocument.id, input.id));
  },
);

export { updateDocumentNotifiedAt };
