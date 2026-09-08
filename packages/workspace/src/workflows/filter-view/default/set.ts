import { workspaceFilterView } from "#/db-schemas";
import { FILTER_VIEW_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFilterViewStep } from "#/workflow-steps/fetch-filter-view";
import { assertCanMutate } from "#/workflow-steps/filter-view-access";
import { unsetDefaultFilterView } from "#/workflows/filter-view/utils";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const SetDefaultInputSchema = object({ id: IdSchema });

export const setDefaultFilterView = Workflow.name("workspace.filter-view.set-default")
  .input(SetDefaultInputSchema)
  .handler(async ({ id }, ctx) => {
    const view = await ctx.step.run(fetchFilterViewStep, { id });
    await assertCanMutate(view, ctx.actorId);

    await ctx.step.run("unset-previous", async () => {
      await unsetDefaultFilterView({
        db: ctx.db,
        domain: view.domain,
        ownerId: view.owner_id,
        projectId: view.project_id,
      });
    });

    const [updated] = await ctx.db
      .update(workspaceFilterView)
      .set({ is_default: true, updated_at: new Date() })
      .where(eq(workspaceFilterView.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Filter view "${id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.FILTER_VIEW,
      metadata: { isDefault: true },
    });

    await ctx.pubsub.publish(FILTER_VIEW_EVENTS.UPDATED, { filterViewId: id });

    return updated;
  });
