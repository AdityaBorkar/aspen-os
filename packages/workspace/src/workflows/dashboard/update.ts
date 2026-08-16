import { workspaceDashboard } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { UpdateDashboardSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchDashboardStep } from "#/workflow-steps/fetch-dashboard";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const UpdateInputSchema = object({ id: string(), input: UpdateDashboardSchema });

export const updateDashboard = Workflow.name("workspace.dashboard.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const dashboard = await ctx.step.run(fetchDashboardStep, { id });
    await assertCanMutate(dashboard, ctx.actorId);
    const parsed = parse(UpdateDashboardSchema, input);

    const updates = stripUndefined({
      access: parsed.access,
      description: parsed.description,
      layout: parsed.layout,
      metadata: parsed.metadata,
      name: parsed.name,
    });

    const [updated] = await ctx.db
      .update(workspaceDashboard)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workspaceDashboard.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Dashboard "${id}" not found.`);
    }

    const previousState = { access: dashboard.access, name: dashboard.name };
    const newState = { access: updated.access, name: updated.name };
    // SAFETY: diff() compares JsonValue-typed state snapshots.
    const changes = ctx.audit.diff(previousState, newState) as
      | Record<string, JsonValue>
      | undefined;

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      changes,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DASHBOARD,
      newState,
      previousState,
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.UPDATED, { dashboardId: id });

    return updated;
  });
