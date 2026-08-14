import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { integer, object, pipe, number as valibotNumber } from "valibot";

import { dmsDocumentVersion } from "../db-schemas";
import { getDmsConfig } from "../runtime";
import { getSetting } from "../services/settings-service";
import { getSignedGetUrl } from "../services/storage-bridge";
import { IdSchema } from "../types";
import { SETTING_KEYS } from "../utils/constants";
import { fetchDocumentStep } from "../workflow-steps/fetch-document";

const GetVersionInputSchema = object({
  documentId: IdSchema,
  version: pipe(valibotNumber(), integer()),
});

export const getDocumentVersion = Workflow.name("dms.version.get")
  .input(GetVersionInputSchema)
  .handler(async ({ documentId, version }, ctx) => {
    const doc = await ctx.step.run(fetchDocumentStep, { documentId });

    const config = getDmsConfig();
    const isCurrent = version === doc.version;
    const storageKey = isCurrent
      ? doc.storageKey
      : await ctx.step.run("fetch-history", async () => {
          const [row] = await ctx.db
            .select({ storageKey: dmsDocumentVersion.storageKey })
            .from(dmsDocumentVersion)
            .where(
              and(
                eq(dmsDocumentVersion.documentId, documentId),
                eq(dmsDocumentVersion.version, version),
              ),
            )
            .limit(1);
          if (!row) {
            throw new Error(`Document "${documentId}" has no version "${version}".`);
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

    return { documentId, url, version };
  });
