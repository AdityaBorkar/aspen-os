import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsFile } from "../db-schemas";
import { FILE_EVENTS } from "../pubsub";
import { FileIdSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";

const DeleteInputSchema = object({ id: FileIdSchema });

export const deleteFile = Workflow.name("dms.file.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const [file] = await ctx.db
      .select({ id: dmsFile.id, status: dmsFile.status })
      .from(dmsFile)
      .where(eq(dmsFile.id, id))
      .limit(1);

    if (!file) {
      throw new Error(`File with id "${id}" not found.`);
    }
    if (file.status === "trashed") {
      throw new Error("File is already in the trash.");
    }

    const deletedBy = ctx.actorId ?? "unknown";
    const [updated] = await ctx.db
      .update(dmsFile)
      .set({ deletedAt: new Date(), deletedBy, status: "trashed", updatedAt: new Date() })
      .where(eq(dmsFile.id, id))
      .returning();

    if (!updated) {
      throw new Error(`File "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FILE,
        metadata: { deletedBy },
        newState: { status: "trashed" },
        previousState: { status: file.status },
      });

      await ctx.pubsub.publish(FILE_EVENTS.TRASHED, { deletedBy, fileId: id });
    });

    return updated ?? file;
  });
