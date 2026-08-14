import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";

import { dmsShare } from "../db-schemas";
import { fetchDocumentStep } from "../workflow-steps/fetch-document";

export const listShares = Workflow.name("dms.share.list").handler(
  async (input: { documentId: string }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, {
      documentId: input.documentId,
    });
    void doc;
    return ctx.db.select().from(dmsShare).where(eq(dmsShare.documentId, input.documentId));
  },
);

export const listSharesByGrantee = Workflow.name("dms.share.list-by-grantee").handler(
  async (input: { granteeId: string; granteeType: "contact" | "user" }, ctx) =>
    ctx.db
      .select()
      .from(dmsShare)
      .where(
        and(eq(dmsShare.granteeId, input.granteeId), eq(dmsShare.granteeType, input.granteeType)),
      ),
);
