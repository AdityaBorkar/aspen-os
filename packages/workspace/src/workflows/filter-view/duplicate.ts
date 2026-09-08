import { workspaceFilterView } from "#/db-schemas";
import { FILTER_VIEW_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, FILTER_VIEW_ACCESS } from "#/utils/constants";
import { fetchFilterViewStep } from "#/workflow-steps/fetch-filter-view";
import { assertCanAccess, resolveActorId } from "#/workflow-steps/filter-view-access";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const DuplicateInputSchema = object({ id: IdSchema });

export const duplicateFilterView = Workflow.name("workspace.filter-view.duplicate")
  .input(DuplicateInputSchema)
  .handler(async ({ id }, ctx) => {
    const view = await ctx.step.run(fetchFilterViewStep, { id });
    assertCanAccess(view, ctx.actorId);
    const ownerId = resolveActorId(ctx.actorId);

    const [duplicate] = await ctx.db
      .insert(workspaceFilterView)
      .values({
        access: FILTER_VIEW_ACCESS.PERSONAL,
        conditions: view.conditions,
        domain: view.domain,
        group_by: view.group_by,
        is_default: false,
        metadata: view.metadata,
        name: view.name,
        owner_id: ownerId,
        project_id: view.project_id,
        sort: view.sort,
        view_type: view.view_type,
      })
      .returning();

    if (!duplicate) {
      throw new Error("Failed to duplicate filter view.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.DUPLICATED,
      crudAction: "create",
      entityId: duplicate.id,
      entityType: AUDIT_ENTITY_TYPE.FILTER_VIEW,
      metadata: { sourceFilterViewId: id },
    });

    await ctx.pubsub.publish(FILTER_VIEW_EVENTS.DUPLICATED, {
      duplicateId: duplicate.id,
      filterViewId: id,
    });

    return duplicate;
  });
