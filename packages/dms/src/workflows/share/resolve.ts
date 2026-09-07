import { dmsFile, dmsShare } from "#/db-schemas";
import { getDmsConfig } from "#/runtime";
import { resolveEntity } from "#/services/entity-resolver";
import { getSignedGetUrl } from "#/services/storage-bridge";
import { ResolveShareTokenSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { object } from "valibot";

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

    const entity = await resolveEntity(ctx.db, share.entityType, share.entityId);
    if (!entity?.isAccessible) {
      throw new Error(
        share.entityType === "file"
          ? "The shared file is not available."
          : "The shared folder is not available.",
      );
    }

    if (share.entityType === "file") {
      const [file] = await ctx.db
        .select({ storageKey: dmsFile.storageKey })
        .from(dmsFile)
        .where(eq(dmsFile.id, share.entityId))
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
        entityId: share.entityId,
        entityType: "file" as const,
        expiresIn: config.defaultDownloadLinkExpiry,
        url,
      };
    }

    return {
      entityId: share.entityId,
      entityType: "folder" as const,
      expiresIn: config.defaultDownloadLinkExpiry,
      url: null,
    };
  });
