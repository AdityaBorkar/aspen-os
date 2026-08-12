import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

import { dmsView } from "../db-schemas";
import { VIEW_EVENTS } from "../pubsub";
import { IdSchema, UpdateViewSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";
import { stripUndefined } from "../utils/strip-undefined";

const UpdateInputSchema = object({ id: IdSchema, patch: UpdateViewSchema });

export const updateView = Workflow.name("dms.view.update")
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
      .update(dmsView)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dmsView.id, id))
      .returning();

    if (!updated) {
      throw new Error(`View "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.VIEW,
        newState: { name: updated.name },
      });

      await ctx.pubsub.publish(VIEW_EVENTS.UPDATED, { viewId: id });
    });

    return updated;
  });
