import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { dmsFile, dmsFileVersion } from "../db-schemas";
import { ITEM_EVENTS } from "../pubsub";
import { remove as removeStorage } from "../services/item-storage-bridge";
import { fetchItemFileStep } from "../workflow-steps/fetch-item-file";
import { WithFileIdSchema } from "./item-utils";

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

    // oxlint-disable eslint/no-await-in-loop
    for (const version of versions) {
      await ctx.step.run("remove-version-storage", async () => {
        await removeStorage({ key: version.storageKey });
      });
    }
    // oxlint-enable eslint/no-await-in-loop

    await ctx.db.delete(dmsFileVersion).where(eq(dmsFileVersion.fileId, id));

    await ctx.db.delete(dmsFile).where(eq(dmsFile.id, id));

    await ctx.pubsub.publish(ITEM_EVENTS.PURGED, {
      itemId: id,
      itemType: "file",
      storageKey: file.storageKey,
    });
  });
