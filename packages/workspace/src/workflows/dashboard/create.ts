import { workspaceDashboard } from "#/db-schemas";
import { DASHBOARD_EVENTS } from "#/pubsub";
import { resolveActorId } from "#/services/access-service";
import { CreateDashboardSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, WORKSPACE_ACCESS } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateDashboardSchema });

export const createDashboard = Workflow.name("workspace.dashboard.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDashboardSchema, input);
    const ownerId = resolveActorId(ctx.actorId, parsed.ownerId);

    const [dashboard] = await ctx.db
      .insert(workspaceDashboard)
      .values({
        access: parsed.access ?? WORKSPACE_ACCESS.PERSONAL,
        description: parsed.description ?? null,
        layout: parsed.layout ?? [],
        metadata: parsed.metadata,
        name: parsed.name,
        ownerId,
      })
      .returning();

    if (!dashboard) {
      throw new Error("Failed to create dashboard.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: dashboard.id,
      entityType: AUDIT_ENTITY_TYPE.DASHBOARD,
      newState: { name: dashboard.name },
    });

    await ctx.pubsub.publish(DASHBOARD_EVENTS.CREATED, {
      access: dashboard.access,
      dashboardId: dashboard.id,
      ownerId: dashboard.ownerId,
    });

    return dashboard;
  });
