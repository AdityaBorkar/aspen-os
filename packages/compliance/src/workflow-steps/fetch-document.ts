import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { complianceDocument } from "../../db-schemas";

export const fetchDocumentStep = WorkflowStep.name("fetch-document").handler(
  async (input: { id: string }, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(complianceDocument)
      .where(eq(complianceDocument.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Compliance document with id "${input.id}" not found.`);
    }

    return result;
  },
);
