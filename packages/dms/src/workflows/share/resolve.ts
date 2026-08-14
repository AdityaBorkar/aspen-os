import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { object } from "valibot";

import { dmsFile, dmsFolder, dmsShare } from "../../db-schemas";
import { getDmsConfig } from "../../runtime";
import { getSignedGetUrl } from "../../services/storage-bridge";
import { ResolveShareTokenSchema } from "../../types";

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

    if (share.entityType === "file") {
      const [file] = await ctx.db
        .select()
        .from(dmsFile)
        .where(and(eq(dmsFile.id, share.entityId), eq(dmsFile.status, "active")))
        .limit(1);

      if (!file) {
        throw new Error("The shared file is not available.");
      }

      const url = await ctx.step.run("get-signed-url", async () =>
        getSignedGetUrl({
          expiresIn: config.defaultDownloadLinkExpiry,
          key: file.storageKey,
        }),
      );

      return {
        entityId: file.id,
        entityType: "file" as const,
        expiresIn: config.defaultDownloadLinkExpiry,
        url,
      };
    }

    const [folder] = await ctx.db
      .select()
      .from(dmsFolder)
      .where(and(eq(dmsFolder.id, share.entityId), eq(dmsFolder.isTrashed, false)))
      .limit(1);

    if (!folder) {
      throw new Error("The shared folder is not available.");
    }

    return {
      entityId: folder.id,
      entityType: "folder" as const,
      expiresIn: config.defaultDownloadLinkExpiry,
      url: null,
    };
  });
