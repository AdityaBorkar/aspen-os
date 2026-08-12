import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveFile, driveFolder } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { fetchFileStep } from "./steps/fetch-file";
import { WithFileIdSchema } from "./utils";

export const restoreFile = Workflow.name("drive.file.restore")
  .input(WithFileIdSchema)
  .handler(async ({ id }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });

    if (file.folderId) {
      const [folder] = await ctx.db
        .select({
          id: driveFolder.id,
          isTrashed: driveFolder.isTrashed,
        })
        .from(driveFolder)
        .where(eq(driveFolder.id, file.folderId))
        .limit(1);

      if (!folder || folder.isTrashed) {
        await ctx.db
          .update(driveFile)
          .set({ folderId: null, updatedAt: new Date() })
          .where(eq(driveFile.id, id));
      }
    }

    const [updated] = await ctx.db
      .update(driveFile)
      .set({
        isTrashed: false,
        trashedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(driveFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "file",
    });

    return updated;
  });
