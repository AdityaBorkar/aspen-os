import { getDmsConfig } from "#/runtime";
import { getSignedGetUrl } from "#/services/storage-bridge";
import { DownloadOptionsSchema, FileIdSchema } from "#/types";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { object, optional } from "valibot";

const DownloadLinkInputSchema = object({
  id: FileIdSchema,
  options: optional(DownloadOptionsSchema),
});

export const getFileDownloadLink = Workflow.name("dms.file.download-link")
  .input(DownloadLinkInputSchema)
  .handler(async ({ id, options }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });
    const config = getDmsConfig();

    const expiresIn = Math.min(
      options?.expiresIn ?? config.defaultDownloadLinkExpiry,
      config.maxDownloadLinkExpiry,
    );

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({ expiresIn, key: file.storageKey }),
    );

    return { expiresIn, file, url };
  });
