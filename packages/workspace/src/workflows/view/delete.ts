import { workspaceView } from "#/db-schemas";
import { VIEW_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchViewStep } from "#/workflow-steps/fetch-view";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const DeleteInputSchema = object({ id: string() });

export const deleteView = Workflow.name("workspace.view.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const view = await ctx.step.run(fetchViewStep, { id });
    await assertCanMutate(view, ctx.actorId);

    await ctx.db.delete(workspaceView).where(eq(workspaceView.id, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.VIEW,
    });

    await ctx.pubsub.publish(VIEW_EVENTS.DELETED, { viewId: id });

    return { id };
  });
