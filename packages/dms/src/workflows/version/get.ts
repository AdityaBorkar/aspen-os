import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { integer, object, pipe, number as valibotNumber } from "valibot";

import { dmsFileVersion } from "../../db-schemas";
import { getDmsConfig } from "../../runtime";
import { getSetting } from "../../services/settings-service";
import { getSignedGetUrl } from "../../services/storage-bridge";
import { IdSchema } from "../../types";
import { SETTING_KEYS } from "../../utils/constants";
import { fetchFileStep } from "../../workflow-steps/fetch-file";

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
      ? file.storageKey
      : await ctx.step.run("fetch-history", async () => {
          const [row] = await ctx.db
            .select({ storageKey: dmsFileVersion.storageKey })
            .from(dmsFileVersion)
            .where(and(eq(dmsFileVersion.fileId, fileId), eq(dmsFileVersion.version, version)))
            .limit(1);
          if (!row) {
            throw new Error(`File "${fileId}" has no version "${version}".`);
          }
          return row.storageKey;
        });

    const defaultExpiry = (await ctx.step.run("resolve-expiry", async () => {
      const setting = (await getSetting(ctx.db, SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY)) as
        | number
        | null;
      return setting ?? config.defaultDownloadLinkExpiry;
    })) as number;
    const maxExpiry = 604800;

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({
        expiresIn: Math.min(defaultExpiry, maxExpiry),
        key: storageKey,
      }),
    );

    return { fileId, url, version };
  });
