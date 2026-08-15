import { dmsFileView } from "#/db-schemas";
import { FILE_VIEW_EVENTS } from "#/pubsub";
import { IdSchema, UpdateFileViewSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";

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

    const [updated] = await ctx.db
      .update(dmsFileView)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dmsFileView.id, id))
      .returning();

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
