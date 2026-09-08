import { masterFilterView } from "#/db-schemas";
import { FILTER_VIEW_EVENTS } from "#/pubsub";
import { CreateFilterViewSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, FILTER_VIEW_ACCESS } from "#/utils/constants";
import { resolveActorId } from "#/workflow-steps/filter-view-access";
import { unsetDefaultFilterView } from "#/workflows/filter-view/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateFilterViewSchema });

export const createFilterView = Workflow.name("masters.filter-view.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateFilterViewSchema, input);
    const ownerId = resolveActorId(ctx.actorId, parsed.ownerId);
    const projectId = parsed.projectId ?? null;

    if (parsed.isDefault) {
      await ctx.step.run("unset-previous-default", async () => {
        await unsetDefaultFilterView({ db: ctx.db, domain: parsed.domain, ownerId, projectId });
      });
    }

    const [view] = await ctx.db
      .insert(masterFilterView)
      .values({
        access: parsed.access ?? FILTER_VIEW_ACCESS.PERSONAL,
        conditions: parsed.conditions ?? [],
        domain: parsed.domain,
        group_by: parsed.groupBy ?? null,
        is_default: parsed.isDefault ?? false,
        metadata: parsed.metadata,
        name: parsed.name,
        owner_id: ownerId,
        project_id: projectId,
        sort: parsed.sort ?? [],
        view_type: parsed.viewType ?? "list",
      })
      .returning();

    if (!view) {
      throw new Error("Failed to create filter view.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: view.id,
      entityType: AUDIT_ENTITY_TYPE.FILTER_VIEW,
      newState: { domain: view.domain, name: view.name },
    });

    await ctx.pubsub.publish(FILTER_VIEW_EVENTS.CREATED, {
      access: view.access,
      domain: view.domain,
      filterViewId: view.id,
      ownerId: view.owner_id,
    });

    return view;
  });
