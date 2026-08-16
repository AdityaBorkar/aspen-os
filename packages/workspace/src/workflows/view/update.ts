import { workspaceView } from "#/db-schemas";
import { VIEW_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { UpdateViewSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchViewStep } from "#/workflow-steps/fetch-view";
import { unsetDefaultView } from "#/workflows/view/utils";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const UpdateInputSchema = object({ id: string(), input: UpdateViewSchema });

export const updateView = Workflow.name("workspace.view.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const view = await ctx.step.run(fetchViewStep, { id });
    await assertCanMutate(view, ctx.actorId);
    const parsed = parse(UpdateViewSchema, input);

    if (parsed.isDefault) {
      await ctx.step.run("unset-previous-default", async () => {
        await unsetDefaultView(ctx.db, view.ownerId, parsed.domain ?? view.domain);
      });
    }

    const updates = stripUndefined({
      access: parsed.access,
      conditions: parsed.conditions,
      domain: parsed.domain,
      groupBy: parsed.groupBy,
      isDefault: parsed.isDefault,
      metadata: parsed.metadata,
      name: parsed.name,
      sort: parsed.sort,
    });

    const [updated] = await ctx.db
      .update(workspaceView)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workspaceView.id, id))
      .returning();

    if (!updated) {
      throw new Error(`View "${id}" not found.`);
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
      entityType: AUDIT_ENTITY_TYPE.VIEW,
      newState,
      previousState,
    });

    await ctx.pubsub.publish(VIEW_EVENTS.UPDATED, { viewId: id });

    return updated;
  });
