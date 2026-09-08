import { masterFilterView } from "#/db-schemas";
import { FILTER_VIEW_EVENTS } from "#/pubsub";
import { UpdateFilterViewSchema } from "#/types";
import type { NewMasterFilterView } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchFilterViewStep } from "#/workflow-steps/fetch-filter-view";
import { assertCanMutate } from "#/workflow-steps/filter-view-access";
import { unsetDefaultFilterView } from "#/workflows/filter-view/utils";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const UpdateInputSchema = object({ id: string(), input: UpdateFilterViewSchema });

export const updateFilterView = Workflow.name("masters.filter-view.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const view = await ctx.step.run(fetchFilterViewStep, { id });
    await assertCanMutate(view, ctx.actorId);
    const parsed = parse(UpdateFilterViewSchema, input);

    if (parsed.isDefault) {
      await ctx.step.run("unset-previous-default", async () => {
        await unsetDefaultFilterView({
          db: ctx.db,
          domain: parsed.domain ?? view.domain,
          ownerId: view.owner_id,
          projectId: view.project_id,
        });
      });
    }

    const setClause: Partial<NewMasterFilterView> = { updated_at: new Date() };
    if (parsed.access !== undefined) {
      setClause.access = parsed.access;
    }
    if (parsed.conditions !== undefined) {
      setClause.conditions = parsed.conditions;
    }
    if (parsed.domain !== undefined) {
      setClause.domain = parsed.domain;
    }
    if (parsed.groupBy !== undefined) {
      setClause.group_by = parsed.groupBy;
    }
    if (parsed.isDefault !== undefined) {
      setClause.is_default = parsed.isDefault;
    }
    if (parsed.metadata !== undefined) {
      setClause.metadata = parsed.metadata;
    }
    if (parsed.name !== undefined) {
      setClause.name = parsed.name;
    }
    if (parsed.sort !== undefined) {
      setClause.sort = parsed.sort;
    }
    if (parsed.viewType !== undefined) {
      setClause.view_type = parsed.viewType;
    }

    const [updated] = await ctx.db
      .update(masterFilterView)
      .set(setClause)
      .where(eq(masterFilterView.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Filter view "${id}" not found.`);
    }

    const previousState = { domain: view.domain, name: view.name };
    const newState = { domain: updated.domain, name: updated.name };
    // SAFETY: diff() compares JsonValue-typed state snapshots.
    const changes = ctx.audit.diff(previousState, newState) as
      | Record<string, JsonValue>
      | undefined;

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      changes,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.FILTER_VIEW,
      newState,
      previousState,
    });

    await ctx.pubsub.publish(FILTER_VIEW_EVENTS.UPDATED, { filterViewId: id });

    return updated;
  });
