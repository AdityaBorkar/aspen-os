import { Workflow } from "@aspen-os/platform/server";
import { and, eq } from "drizzle-orm";
import { boolean, object, optional, string } from "valibot";

import { dmsFile, dmsFolder } from "../../db-schemas";
import { FOLDER_EVENTS } from "../../pubsub";

const DeleteInputSchema = object({
  force: optional(boolean()),
  id: string(),
});

export const deleteFolder = Workflow.name("dms.folder.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id, force }, ctx) => {
    await ctx.step.run("check-exists", async () => {
      const [row] = await ctx.db
        .select({ id: dmsFolder.id })
        .from(dmsFolder)
        .where(eq(dmsFolder.id, id))
        .limit(1);
      if (!row) {
        throw new Error(`Folder with id "${id}" not found.`);
      }
      return row;
    });

    const [childFolder] = await ctx.db
      .select({ id: dmsFolder.id })
      .from(dmsFolder)
      .where(and(eq(dmsFolder.parentId, id), eq(dmsFolder.isTrashed, false)))
      .limit(1);

    const [childFile] = await ctx.db
      .select({ id: dmsFile.id })
      .from(dmsFile)
      .where(and(eq(dmsFile.folderId, id), eq(dmsFile.status, "active")))
      .limit(1);

    if ((childFolder || childFile) && !force) {
      throw new Error(
        "Cannot delete a non-empty folder. Use force=true or empty the folder first.",
      );
    }

    const [updated] = await ctx.db
      .update(dmsFolder)
      .set({ isTrashed: true, trashedAt: new Date(), updatedAt: new Date() })
      .where(eq(dmsFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(FOLDER_EVENTS.TRASHED, { folderId: id });

    return updated;
  });
