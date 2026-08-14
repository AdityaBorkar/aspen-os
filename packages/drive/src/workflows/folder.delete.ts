import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { boolean, object, optional, string } from "valibot";

import { driveFile, driveFolder } from "../db-schemas";
import { DRIVE_EVENTS } from "../pubsub";

const DeleteInputSchema = object({
  force: optional(boolean()),
  id: string(),
});

export const deleteFolder = Workflow.name("drive.folder.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id, force }, ctx) => {
    await ctx.step.run("check-exists", async () => {
      const [row] = await ctx.db
        .select({ id: driveFolder.id })
        .from(driveFolder)
        .where(eq(driveFolder.id, id))
        .limit(1);
      if (!row) {
        throw new Error(`Folder with id "${id}" not found.`);
      }
      return row;
    });

    const [childFolder] = await ctx.db
      .select({ id: driveFolder.id })
      .from(driveFolder)
      .where(and(eq(driveFolder.parentId, id), eq(driveFolder.isTrashed, false)))
      .limit(1);

    const [childFile] = await ctx.db
      .select({ id: driveFile.id })
      .from(driveFile)
      .where(and(eq(driveFile.folderId, id), eq(driveFile.isTrashed, false)))
      .limit(1);

    if ((childFolder || childFile) && !force) {
      throw new Error(
        "Cannot delete a non-empty folder. Use force=true or empty the folder first.",
      );
    }

    const [updated] = await ctx.db
      .update(driveFolder)
      .set({ isTrashed: true, trashedAt: new Date(), updatedAt: new Date() })
      .where(eq(driveFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(DRIVE_EVENTS.TRASHED, {
      itemId: id,
      itemType: "folder",
    });

    return updated;
  });
