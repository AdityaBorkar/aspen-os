import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsFile, dmsFileVersion } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { remove as removeStorage } from "../services/item-storage-bridge";
import { WithFileIdSchema } from "./item-utils";
import { fetchItemFileStep } from "./steps/fetch-item-file";

export const purgeItemFile = Workflow.name("dms.file.purge")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run(fetchItemFileStep, { id });

    await ctx.step.run("remove-storage", async () => {
      await removeStorage({ key: file.storageKey });
    });

    const versions = await ctx.db
      .select({ storageKey: dmsFileVersion.storageKey })
      .from(dmsFileVersion)
      .where(eq(dmsFileVersion.fileId, id));

    for (const v of versions) {
      await ctx.step.run("remove-version-storage", async () => {
        await removeStorage({ key: v.storageKey });
      });
    }

    await ctx.db.delete(dmsFileVersion).where(eq(dmsFileVersion.fileId, id));

    await ctx.db.delete(dmsFile).where(eq(dmsFile.id, id));

    await ctx.pubsub.publish(ITEM_EVENTS.PURGED, {
      itemId: id,
      itemType: "file",
      storageKey: file.storageKey,
    });
  });
