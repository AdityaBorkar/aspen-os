import { dmsFileView } from "#/db-schemas";
import { FILE_VIEW_EVENTS } from "#/pubsub";
import { IdSchema, UpdateFileViewSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { unsetDefaultFileView } from "#/workflows/file-view/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, patch: UpdateFileViewSchema });

export const updateFileView = Workflow.name("dms.file-view.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, patch }, ctx) => {
    const updates = stripUndefined({
      filters: patch.filters,
      isDefault: patch.isDefault,
      isShared: patch.isShared,
      name: patch.name,
      sort: patch.sort,
    });

    const updated = await ctx.db.transaction(async (tx) => {
      // Default-flip must be atomic with the update so two concurrent
      // default flips cannot leave two defaults for one owner.
      if (updates.isDefault === true) {
        const [current] = await tx
          .select({ ownerId: dmsFileView.ownerId })
          .from(dmsFileView)
          .where(eq(dmsFileView.id, id))
          .limit(1);
        if (!current) {
          throw new Error(`File view "${id}" not found.`);
        }
        await unsetDefaultFileView(tx, current.ownerId);
      }

      const [next] = await tx
        .update(dmsFileView)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(dmsFileView.id, id))
        .returning();
      return next;
    });

    if (!updated) {
      throw new Error(`File view "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.FILE_VIEW,
        newState: { name: updated.name },
      });

      await ctx.pubsub.publish(FILE_VIEW_EVENTS.UPDATED, { fileViewId: id });
    });

    return updated;
  });
