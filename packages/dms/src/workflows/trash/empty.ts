import { dmsFile, dmsFolder, dmsLegalHold } from "#/db-schemas";
import { FILE_EVENTS, FOLDER_EVENTS } from "#/pubsub";
import { deleteFilePermanently, deleteFolderPermanently } from "#/services/purge-service";
import { EmptyTrashOptionsSchema } from "#/types";
import type { EmptyTrashOptions } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

const EmptyTrashSchema = EmptyTrashOptionsSchema;

export const emptyTrash = Workflow.name("dms.trash.empty")
  .input(EmptyTrashSchema)
  .handler(async (input, ctx) => {
    // SAFETY: input was validated against EmptyTrashSchema by the workflow runner.
    // The assertion only marks it optional for the options access below.
    const validated = input as EmptyTrashOptions | undefined;

    const fileConditions: SQL[] = [
      or(eq(dmsFile.status, "trashed"), eq(dmsFile.status, "expired"))!,
    ];
    const folderConditions: SQL[] = [eq(dmsFolder.isTrashed, true)];

    if (validated?.ownerId) {
      fileConditions.push(eq(dmsFile.ownerId, validated.ownerId));
      folderConditions.push(eq(dmsFolder.ownerId, validated.ownerId));
    }

    const trashedFiles = await ctx.db
      .select({ id: dmsFile.id })
      .from(dmsFile)
      .where(and(...fileConditions));

    const heldIds = new Set<string>();
    if (trashedFiles.length > 0) {
      const heldRows = await ctx.db
        .select({ fileId: dmsLegalHold.fileId })
        .from(dmsLegalHold)
        .where(
          and(
            isNull(dmsLegalHold.releasedAt),
            or(...trashedFiles.map((row) => eq(dmsLegalHold.fileId, row.id))),
          ),
        );
      for (const hold of heldRows) {
        heldIds.add(hold.fileId);
      }
    }

    const purgeableFiles = trashedFiles.filter((row) => !heldIds.has(row.id));

    await Promise.all(
      purgeableFiles.map(async (file) => {
        const keys = await deleteFilePermanently(ctx.db, file.id);

        await ctx.audit.write({
          action: AUDIT_ACTION.PURGED,
          crudAction: "delete",
          entityId: file.id,
          entityType: AUDIT_ENTITY_TYPE.FILE,
          metadata: { storageKey: keys[0] ?? null },
        });

        await ctx.pubsub.publish(FILE_EVENTS.PURGED, {
          fileId: file.id,
          storageKey: keys[0] ?? "",
        });
      }),
    );

    const trashedFolders = await ctx.db
      .select({ id: dmsFolder.id })
      .from(dmsFolder)
      .where(and(...folderConditions));

    let folderCount = 0;
    // oxlint-disable eslint/no-await-in-loop
    for (const folder of trashedFolders) {
      const result = await deleteFolderPermanently(ctx.db, folder.id);
      folderCount += result.folders.length;
      for (const folderId of result.folders) {
        await ctx.pubsub.publish(FOLDER_EVENTS.PURGED, { folderId });
      }
    }
    // oxlint-enable eslint/no-await-in-loop

    return {
      filesPurged: purgeableFiles.length,
      foldersPurged: folderCount,
      skippedHeld: heldIds.size,
    };
  });
