import { getDmsConfig } from "#/runtime";
import { getDownloadLink, resolveDownloadExpiry } from "#/services/download-link-service";
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

    const expiresIn = resolveDownloadExpiry({
      defaultExpiry: config.defaultDownloadLinkExpiry,
      maxExpiry: config.maxDownloadLinkExpiry,
      requested: options?.expiresIn,
    });

    const url = await ctx.step.run("get-signed-url", async () =>
      getDownloadLink({ expiresIn, key: file.storageKey }),
    );

    return { expiresIn, file, url };
  });
