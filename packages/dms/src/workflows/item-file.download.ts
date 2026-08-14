import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { number, object, optional } from "valibot";

import { dmsFile } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { getDmsConfig } from "../runtime";
import { getSignedGetUrl } from "../services/item-storage-bridge";
import { FileIdSchema } from "./item-utils";

const DownloadInputSchema = object({
  id: FileIdSchema,
  options: optional(object({ expiresIn: optional(number()) })),
});

export const downloadItemFile = Workflow.name("dms.file.download")
  .input(DownloadInputSchema)
  .handler(async ({ id, options = {} }, ctx) => {
    const file = await ctx.step.run("fetch-file", async () => {
      const [row] = await ctx.db.select().from(dmsFile).where(eq(dmsFile.id, id)).limit(1);
      if (!row) {
        throw new Error(`File with id "${id}" not found.`);
      }
      return row;
    });
    const config = getDmsConfig();

    const expiresIn = Math.min(
      options.expiresIn ?? config.defaultDownloadLinkExpiry,
      config.maxDownloadLinkExpiry,
    );

    const url = await ctx.step.run("get-signed-url", async () =>
      getSignedGetUrl({ expiresIn, key: file.storageKey }),
    );

    await ctx.pubsub.publish(ITEM_EVENTS.FILE_DOWNLOADED, {
      file: {
        id: file.id,
        name: file.name,
        ownerId: file.ownerId,
      },
      userId: ctx.actorId ?? "",
    });

    return { file, url };
  });
