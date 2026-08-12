import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

import { dmsDocument } from "../../db-schemas";

export const fetchDocumentStep = WorkflowStep.name("dms-fetch-document")
  .input(
    object({
      documentId: string(),
    }),
  )
  .handler(async (input, ctx) => {
    const [doc] = await ctx.db
      .select()
      .from(dmsDocument)
      .where(eq(dmsDocument.id, input.documentId))
      .limit(1);

    if (!doc) {
      throw new Error(`Document with id "${input.documentId}" not found.`);
    }
    return doc;
  });
