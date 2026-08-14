import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { nullable, object, optional, string } from "valibot";

import { dmsFile, dmsFolder } from "../../db-schemas";
import { FILE_EVENTS } from "../../pubsub";
import { FileIdSchema } from "../../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../../utils/constants";
import { fetchFileStep } from "../../workflow-steps/fetch-file";

const RestoreInputSchema = object({ expiryDate: optional(nullable(string())), id: FileIdSchema });

export const restoreFile = Workflow.name("dms.file.restore")
  .input(RestoreInputSchema)
  .handler(async ({ id, expiryDate }, ctx) => {
    const file = await ctx.step.run(fetchFileStep, { id });

    if (file.status !== "trashed" && file.status !== "expired") {
      throw new Error(`File "${id}" is not in the trash.`);
    }

    let { folderId } = file;
    if (folderId) {
      const [folder] = await ctx.db
        .select({ id: dmsFolder.id, isTrashed: dmsFolder.isTrashed })
        .from(dmsFolder)
        .where(eq(dmsFolder.id, folderId))
        .limit(1);
      if (!folder || folder.isTrashed) {
        folderId = null;
      }
    }

    const [updated] = await ctx.db
      .update(dmsFile)
      .set({
        deletedAt: null,
        deletedBy: null,
        expiredAt: null,
        expiryDate: expiryDate ?? null,
        folderId,
        path: folderId ? file.path : null,
        status: "active",
        updatedAt: new Date(),
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

    return updated ?? file;
  });
