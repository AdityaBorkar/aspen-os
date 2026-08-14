import { Workflow } from "@aspen-os/platform/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { number, object, optional } from "valibot";

import { dmsShare } from "../db-schemas";
import { getDmsConfig } from "../runtime";
import { getSetting } from "../services/settings-service";
import { getSignedGetUrl } from "../services/storage-bridge";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SETTING_KEYS } from "../utils/constants";
import { fetchDocumentStep } from "./steps/fetch-document";

const DownloadInputSchema = object({
  id: IdSchema,
  options: optional(object({ expiresIn: optional(number()) })),
});

type DB = NodePgDatabase<Record<string, never>>;

export async function resolveGranteeAccess(
  db: DB,
  documentId: string,
  userId: string,
): Promise<boolean> {
  if (userId === "dms:admin") {
    return true;
  }
  const [share] = await db
    .select({ id: dmsShare.id })
    .from(dmsShare)
    .where(
      and(
        eq(dmsShare.documentId, documentId),
        eq(dmsShare.granteeType, "user"),
        eq(dmsShare.granteeId, userId),
        or(isNull(dmsShare.expiresAt), gt(dmsShare.expiresAt, new Date())),
      ),
    )
    .limit(1);
  return Boolean(share);
}

export const downloadDocument = Workflow.name("dms.document.download")
  .input(DownloadInputSchema)
  .handler(async ({ id, options = {} }, ctx) => {
    const config = getDmsConfig();
    const doc = await ctx.step.run(fetchDocumentStep, { documentId: id });

    const expiresIn = await ctx.step.run("resolve-expiry", async () => {
      const defaultExpiry = (await getSetting(
        ctx.db,
        SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY,
      )) as number | null;
      const maxExpiry = (await getSetting(ctx.db, SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY)) as
        | number
        | null;
      const defaultExpirySecs = defaultExpiry ?? config.defaultDownloadLinkExpiry;
      const maxExpirySecs = maxExpiry ?? config.maxDownloadLinkExpiry;
      return Math.min(options.expiresIn ?? defaultExpirySecs, maxExpirySecs);
    });

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({ expiresIn, key: doc.storageKey }),
    );

    await ctx.step.run("maybe-audit-download", async () => {
      const logDownloads = (await getSetting(ctx.db, SETTING_KEYS.LOG_DOWNLOADS)) as boolean | null;
      if (logDownloads) {
        await ctx.audit.write({
          action: AUDIT_ACTION.DOWNLOADED,
          entityId: id,
          entityType: AUDIT_ENTITY_TYPE.DOCUMENT,
          metadata: { storageKey: doc.storageKey, version: doc.version },
        });
      }
    });

    return { document: doc, expiresIn, url };
  });
