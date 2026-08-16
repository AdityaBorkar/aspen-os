import { workspaceView } from "#/db-schemas";
import { VIEW_EVENTS } from "#/pubsub";
import { resolveActorId } from "#/services/access-service";
import { CreateViewSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, WORKSPACE_ACCESS } from "#/utils/constants";
import { unsetDefaultView } from "#/workflows/view/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateViewSchema });

export const createView = Workflow.name("workspace.view.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateViewSchema, input);
    const ownerId = resolveActorId(ctx.actorId, parsed.ownerId);

    if (parsed.isDefault) {
      await ctx.step.run("unset-previous-default", async () => {
        await unsetDefaultView(ctx.db, ownerId, parsed.domain);
      });
    }

    const [view] = await ctx.db
      .insert(workspaceView)
      .values({
        access: parsed.access ?? WORKSPACE_ACCESS.PERSONAL,
        conditions: parsed.conditions ?? [],
        domain: parsed.domain,
        groupBy: parsed.groupBy ?? null,
        isDefault: parsed.isDefault ?? false,
        metadata: parsed.metadata,
        name: parsed.name,
        ownerId,
        sort: parsed.sort ?? [],
      })
      .returning();

    if (!view) {
      throw new Error("Failed to create view.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: view.id,
      entityType: AUDIT_ENTITY_TYPE.VIEW,
      newState: { domain: view.domain, name: view.name },
    });

    await ctx.pubsub.publish(VIEW_EVENTS.CREATED, {
      access: view.access,
      domain: view.domain,
      ownerId: view.ownerId,
      viewId: view.id,
    });

    return view;
  });
