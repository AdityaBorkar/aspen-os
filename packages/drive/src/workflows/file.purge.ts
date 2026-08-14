import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveFile, driveFileVersion } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { remove as removeStorage } from "../services/storage-bridge";
import { fetchFileStep } from "./steps/fetch-file";
import { WithFileIdSchema } from "./utils";

export const purgeFile = Workflow.name("drive.file.purge")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });

    await ctx.step.run("remove-storage", async () => {
      await removeStorage({ key: file.storageKey });
    });

    const versions = await ctx.db
      .select({ storageKey: driveFileVersion.storageKey })
      .from(driveFileVersion)
      .where(eq(driveFileVersion.fileId, id));

    for (const v of versions) {
      await ctx.step.run("remove-version-storage", async () => {
        await removeStorage({ key: v.storageKey });
      });
    }

    await ctx.db.delete(driveFileVersion).where(eq(driveFileVersion.fileId, id));

    await ctx.db.delete(driveFile).where(eq(driveFile.id, id));

    await ctx.pubsub.publish(DRIVE_EVENTS.PURGED, {
      itemId: id,
      itemType: "file",
      storageKey: file.storageKey,
    });
  });
