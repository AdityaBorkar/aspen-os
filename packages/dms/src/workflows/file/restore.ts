import { dmsFile, dmsFolder } from "#/db-schemas";
import { FILE_EVENTS } from "#/pubsub";
import { FileIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFileStep } from "#/workflow-steps/fetch-file";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { nullable, object, optional, string } from "valibot";

const RestoreInputSchema = object({ expiryDate: optional(nullable(string())), id: FileIdSchema });

export const restoreFile = Workflow.name("dms.file.restore")
  .input(RestoreInputSchema)
  .handler(async ({ id, expiryDate }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });

    if (file.status !== "trashed" && file.status !== "expired") {
      throw new Error(`File "${id}" is not in the trash.`);
    }

    let { folder_id } = file;
    if (folder_id) {
      const [folder] = await ctx.db
        .select({ id: dmsFolder.id, isTrashed: dmsFolder.is_trashed })
        .from(dmsFolder)
        .where(eq(dmsFolder.id, folder_id))
        .limit(1);
      if (!folder || folder.isTrashed) {
        folder_id = null;
      }
    }

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({
        deleted_at: null,
        deleted_by: null,
        expired_at: null,
        expiry_date: expiryDate ?? null,
        folder_id,
        path: folder_id ? file.path : null,
        status: "active",
        updated_at: new Date(),
      })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.RESTORED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        newState: { status: "active" },
        previousState: { status: file.status },
      });

      await ctx.pubsub.publish(FILE_EVENTS.RESTORED, { fileId: id });
    });

    return updated;
  });
