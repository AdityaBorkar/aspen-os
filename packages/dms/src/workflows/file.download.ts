import { Workflow } from "@aspen-os/platform/server";
import { object, optional } from "valibot";

import { FILE_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { getSetting } from "../services/settings-service";
import { getSignedGetUrl } from "../services/storage-bridge";
import { DownloadOptionsSchema, FileIdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, SETTING_KEYS } from "../utils/constants";
import { fetchFileStep } from "../workflow-steps/fetch-file";

const DownloadInputSchema = object({ id: FileIdSchema, options: optional(DownloadOptionsSchema) });

export const downloadFile = Workflow.name("dms.file.download")
  .input(DownloadInputSchema)
  .handler(async ({ id, options }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const config = getDmsConfig();

    const defaultExpiry =
      ((await getSetting(ctx.db, SETTING_KEYS.PRESIGNED_URL_DEFAULT_EXPIRY)) as number | null) ??
      config.defaultDownloadLinkExpiry;
    const maxExpiry =
      ((await getSetting(ctx.db, SETTING_KEYS.PRESIGNED_URL_MAX_EXPIRY)) as number | null) ??
      config.maxDownloadLinkExpiry;

    const expiresIn = Math.min(options?.expiresIn ?? defaultExpiry, maxExpiry);

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({ expiresIn, key: file.storageKey }),
    );

    const logDownloads = (await getSetting(ctx.db, SETTING_KEYS.LOG_DOWNLOADS)) as boolean | null;
    if (logDownloads) {
      await ctx.audit.write({
        action: AUDIT_ACTION.DOWNLOADED,
        entityId: file.id,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { storageKey: file.storageKey, version: file.version },
      });
    }

    await ctx.pubsub.publish(FILE_EVENTS.DOWNLOADED, {
      file: { id: file.id, name: file.name, ownerId: file.ownerId },
      userId: ctx.actorId ?? "",
    });

    return { expiresIn, file, url };
  });
