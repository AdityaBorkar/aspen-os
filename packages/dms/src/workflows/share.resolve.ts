import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { object } from "valibot";

import { dmsDocument, dmsShare } from "../db-schemas";
import { getDmsConfig } from "../runtime";
import { getSignedGetUrl } from "../services/storage-bridge";
import { ResolveShareTokenSchema } from "../types";

const ResolveInputSchema = object({ input: ResolveShareTokenSchema });

export const resolveShareToken = Workflow.name("dms.share.resolve")
  .input(ResolveInputSchema)
  .handler(async ({ input }, ctx) => {
    const config = getDmsConfig();

    const [share] = await ctx.db
      .select()
      .from(dmsShare)
      .where(
        and(
          eq(dmsShare.shareToken, input.token),
          or(isNull(dmsShare.expiresAt), gt(dmsShare.expiresAt, new Date())),
        ),
      )
      .limit(1);

    if (!share) {
      throw new Error("Invalid or expired share token.");
    }

    const [doc] = await ctx.db
      .select()
      .from(dmsDocument)
      .where(and(eq(dmsDocument.id, share.documentId), eq(dmsDocument.status, "active")))
      .limit(1);

    if (!doc) {
      throw new Error("The shared document is not available.");
    }

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({
        expiresIn: config.defaultDownloadLinkExpiry,
        key: doc.storageKey,
      }),
    );

    return {
      documentId: doc.id,
      expiresIn: config.defaultDownloadLinkExpiry,
      url,
    };
  });
