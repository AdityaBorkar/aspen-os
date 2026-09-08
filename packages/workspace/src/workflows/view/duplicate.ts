import { workspaceView } from "#/db-schemas";
import { VIEW_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, WORKSPACE_ACCESS } from "#/utils/constants";
import { assertCanAccess, resolveActorId } from "#/workflow-steps/access-service";
import { fetchViewStep } from "#/workflow-steps/fetch-view";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const DuplicateInputSchema = object({ id: IdSchema });

export const duplicateView = Workflow.name("workspace.view.duplicate")
  .input(DuplicateInputSchema)
  .handler(async ({ id }, ctx) => {
    const view = await ctx.step.run(fetchViewStep, { id });
    assertCanAccess(view, ctx.actorId);
    const ownerId = resolveActorId(ctx.actorId);

    const [duplicate] = await ctx.db
      .insert(workspaceView)
      .values({
        access: WORKSPACE_ACCESS.PERSONAL,
        conditions: view.conditions,
        domain: view.domain,
        group_by: view.group_by,
        is_default: false,
        metadata: view.metadata,
        name: view.name,
        owner_id: ownerId,
        sort: view.sort,
      })
      .returning();

    if (!duplicate) {
      throw new Error("Failed to duplicate view.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.DUPLICATED,
      crudAction: "create",
      entityId: duplicate.id,
      entityType: AUDIT_ENTITY_TYPE.VIEW,
      metadata: { sourceViewId: id },
    });

    await ctx.pubsub.publish(VIEW_EVENTS.DUPLICATED, { duplicateId: duplicate.id, viewId: id });

    return duplicate;
  });
