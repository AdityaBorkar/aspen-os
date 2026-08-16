import { workspaceView } from "#/db-schemas";
import { VIEW_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchViewStep } from "#/workflow-steps/fetch-view";
import { unsetDefaultView } from "#/workflows/view/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const SetDefaultInputSchema = object({ id: IdSchema });

export const setDefaultView = Workflow.name("workspace.view.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ id }, ctx) => {
    const view = await ctx.step.run(fetchViewStep, { id });
    await assertCanMutate(view, ctx.actorId);

    await ctx.step.run("unset-previous", async () => {
      await unsetDefaultView(ctx.db, view.ownerId, view.domain);
    });

    const [updated] = await ctx.db
      .update(workspaceView)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(workspaceView.id, id))
      .returning();

    if (!updated) {
      throw new Error(`View "${id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.VIEW,
      metadata: { isDefault: true },
    });

    await ctx.pubsub.publish(VIEW_EVENTS.UPDATED, { viewId: id });

    return updated;
  });
