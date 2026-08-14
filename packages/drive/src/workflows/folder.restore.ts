import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

import { driveFolder } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";
import { fetchFolderStep } from "../workflow-steps/fetch-folder";
import { WithIdSchema } from "./utils";

export const restoreFolder = Workflow.name("drive.folder.restore")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const fetched = await ctx.step.run(fetchFolderStep, { id });

    if (fetched.parentId) {
      const [parent] = await ctx.db
        .select({ id: driveFolder.id, isTrashed: driveFolder.isTrashed })
        .from(driveFolder)
        .where(eq(driveFolder.id, fetched.parentId))
        .limit(1);

      if (!parent || parent.isTrashed) {
        await ctx.db
          .update(driveFolder)
          .set({ parentId: null, updatedAt: new Date() })
          .where(eq(driveFolder.id, id));
      }
    }

    const [updated] = await ctx.db
      .update(driveFolder)
      .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
      .where(eq(driveFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(DRIVE_EVENTS.RESTORED, {
      itemId: id,
      itemType: "folder",
    });

    return updated;
  });
