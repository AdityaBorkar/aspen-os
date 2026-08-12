import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { number, object, optional } from "valibot";

import { driveFile } from "../db-schemas";
import { getDriveConfig } from "../runtime";
import { getSignedGetUrl } from "../services/storage-bridge";
import { FileIdSchema } from "./utils";

const DownloadInputSchema = object({
  id: FileIdSchema,
  options: optional(object({ expiresIn: optional(number()) })),
});

export const getFileDownloadLink = Workflow.name("drive.file.download-link")
  .input(DownloadInputSchema)
  .handler(async ({ id, options = {} }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db
        .select()
        .from(driveFile)
        .where(eq(driveFile.id, id))
        .limit(1);
      if (!row) throw new Error(`File with id "${id}" not found.`);
      return row;
    });
    const config = getDriveConfig();

    const expiresIn = Math.min(
      options.expiresIn ?? config.defaultDownloadLinkExpiry,
      config.maxDownloadLinkExpiry,
    );

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({ expiresIn, key: file.storageKey }),
    );

    return { file, url };
  });
