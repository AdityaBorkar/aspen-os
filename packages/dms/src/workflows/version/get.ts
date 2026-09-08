import { dmsFileVersion } from "#/db-schemas";
import { getDmsConfig } from "#/runtime";
import { resolveDownloadExpiry } from "#/services/download-link-service";
import { getSignedGetUrl } from "#/services/storage-bridge";
import { IdSchema } from "#/types";
import { SETTING_KEYS } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";
import { getSetting } from "#/workflow-steps/settings-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { integer, object, pipe, number as valibotNumber, safeParse } from "valibot";

const GetVersionInputSchema = object({
  fileId: IdSchema,
  version: pipe(valibotNumber(), integer()),
});

export const getFileVersion = Workflow.name("dms.version.get")
  .input(GetVersionInputSchema)
  .handler(async ({ fileId, version }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id: fileId });

    const config = getDmsConfig();
    const isCurrent = version === file.version;
    const storageKey = isCurrent
      ? file.storage_key
      : await ctx.step.run("fetch-history", async () => {
          const [row] = await ctx.db
            .select({ storageKey: dmsFileVersion.storage_key })
            .from(dmsFileVersion)
            .where(and(eq(dmsFileVersion.file_id, fileId), eq(dmsFileVersion.version, version)))
            .limit(1);
          if (!row) {
            throw new Error(`File "${fileId}" has no version "${version}".`);
          }
          return row.storageKey;
        });

    const defaultExpiry = await ctx.step.run("resolve-expiry", async () => {
      const setting = await getSetting(ctx.db, SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY);
      const parsed = safeParse(valibotNumber(), setting);
      return parsed.success ? parsed.output : config.defaultDownloadLinkExpiry;
    });

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({
        expiresIn: resolveDownloadExpiry({
          defaultExpiry,
          maxExpiry: config.maxDownloadLinkExpiry,
          requested: null,
        }),
        key: storageKey,
      }),
    );

    return { fileId, url, version };
  });
