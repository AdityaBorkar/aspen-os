import { dmsFolder } from "#/db-schemas";
import { FOLDER_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { fetchFolderStep } from "#/workflow-steps/fetch-folder";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const restoreFolder = Workflow.name("dms.folder.restore")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const fetched = await ctx.step.run(fetchFolderStep, { id });

    if (fetched.parentId) {
      const [parent] = await ctx.db
        .select({ id: dmsFolder.id, isTrashed: dmsFolder.isTrashed })
        .from(dmsFolder)
        .where(eq(dmsFolder.id, fetched.parentId))
        .limit(1);

      if (!parent || parent.isTrashed) {
        await ctx.db
          .update(dmsFolder)
          .set({ parentId: null, updatedAt: new Date() })
          .where(eq(dmsFolder.id, id));
      }
    }

    const [updated] = await ctx.db
      .update(dmsFolder)
      .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
      .where(eq(dmsFolder.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Folder with id "${id}" not found.`);
    }

    await ctx.pubsub.publish(FOLDER_EVENTS.RESTORED, { folderId: id });

    return updated;
  });
