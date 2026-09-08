import { workspaceFilterView } from "#/db-schemas";
import { FILTER_VIEW_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFilterViewStep } from "#/workflow-steps/fetch-filter-view";
import { assertCanMutate } from "#/workflow-steps/filter-view-access";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const DeleteInputSchema = object({ id: string() });

export const deleteFilterView = Workflow.name("workspace.filter-view.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const view = await ctx.step.run(fetchFilterViewStep, { id });
    await assertCanMutate(view, ctx.actorId);

    await ctx.db.delete(workspaceFilterView).where(eq(workspaceFilterView.id, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.FILTER_VIEW,
    });

    await ctx.pubsub.publish(FILTER_VIEW_EVENTS.DELETED, { filterViewId: id });

    return { id };
  });
