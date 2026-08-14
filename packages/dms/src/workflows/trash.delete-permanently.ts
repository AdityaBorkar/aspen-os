import { Workflow } from "@aspen-os/platform/server";
import { object, picklist } from "valibot";

import { FILE_EVENTS, FOLDER_EVENTS } from "../pubsub";
import {
  deleteFilePermanently,
  deleteFolderPermanently,
  isFileHeld,
} from "../services/purge-service";
import { IdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { fetchFileStep } from "../workflow-steps/fetch-file";
import { fetchFolderStep } from "../workflow-steps/fetch-folder";

const DeleteInputSchema = object({
  entityType: picklist(["file", "folder"]),
  id: IdSchema,
});

export const deletePermanently = Workflow.name("dms.trash.delete-permanently")
  .input(DeleteInputSchema)
  .handler(async ({ id, entityType }, ctx) => {
    if (ctx.actorId !== "dms:admin") {
      throw new Error("Only admins can permanently delete items from the trash.");
    }

    if (entityType === "file") {
      const file = await ctx.step.run(fetchFileStep, { id });

      if (file.status !== "trashed" && file.status !== "expired") {
        throw new Error("Only files in the trash can be permanently deleted.");
      }

      if (await isFileHeld(ctx.db, id)) {
        throw new Error(
          `File "${id}" is under an active legal hold and cannot be permanently deleted.`,
        );
      }

      const keys = await ctx.step.run("purge-file", async () => deleteFilePermanently(ctx.db, id));

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.PURGED,
          crudAction: "delete",
          entityId: id,
          entityType: AUDIT_ENTITY_TYPE.FILE,
          metadata: { storageKey: keys[0] ?? null },
        });

        await ctx.pubsub.publish(FILE_EVENTS.PURGED, {
          fileId: id,
          storageKey: keys[0] ?? file.storageKey,
        });
      });

      return { deleted: true, freedStorageKeys: keys };
    }

    const folder = await ctx.step.run(fetchFolderStep, { id });

    if (!folder.isTrashed) {
      throw new Error("Only folders in the trash can be permanently deleted.");
    }

    const result = await ctx.step.run("purge-folder", async () =>
      deleteFolderPermanently(ctx.db, id),
    );

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.PURGED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FOLDER,
        metadata: { fileCount: result.files.length, folderCount: result.folders.length },
      });

      // oxlint-disable eslint/no-await-in-loop
      for (const folderId of result.folders) {
        await ctx.pubsub.publish(FOLDER_EVENTS.PURGED, { folderId });
      }
      // oxlint-enable eslint/no-await-in-loop
    });

    return { deleted: true, fileCount: result.files.length, folderCount: result.folders.length };
  });
