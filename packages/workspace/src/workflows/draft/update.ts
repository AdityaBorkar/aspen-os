import { workspaceDraft } from "#/db-schemas";
import { DRAFT_EVENTS } from "#/pubsub";
import { UpdateDraftSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { assertCanMutate } from "#/workflow-steps/access-service";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse, string } from "valibot";

const UpdateInputSchema = object({ id: string(), input: UpdateDraftSchema });

export const updateDraft = Workflow.name("workspace.draft.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const draft = await ctx.step.run(fetchDraftStep, { id });
    await assertCanMutate(draft, ctx.actorId);
    const parsed = parse(UpdateDraftSchema, input);

    const updates = stripUndefined({
      access: parsed.access,
      body: parsed.body,
      metadata: parsed.metadata,
      notes: parsed.notes,
      targetDomain: parsed.targetDomain,
      targetEntityId: parsed.targetEntityId,
      targetEntityType: parsed.targetEntityType,
      title: parsed.title,
    });

    if (Object.keys(updates).length === 0) {
      return draft;
    }

    const [updated] = await ctx.db
      .update(workspaceDraft)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(workspaceDraft.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Draft "${id}" not found.`);
    }

    const previousState = {
      access: draft.access,
      body: draft.body,
      notes: draft.notes,
      targetDomain: draft.target_domain,
      targetEntityId: draft.target_entity_id,
      targetEntityType: draft.target_entity_type,
      title: draft.title,
    };
    const newState = {
      access: updated.access,
      body: updated.body,
      notes: updated.notes,
      targetDomain: updated.target_domain,
      targetEntityId: updated.target_entity_id,
      targetEntityType: updated.target_entity_type,
      title: updated.title,
    };
    // SAFETY: diff() compares JsonValue-typed state snapshots. New/old values
    // Are JSON-safe and fit both the audit entry and event contracts.
    const changes = ctx.audit.diff(previousState, newState) as
      | Record<string, JsonValue>
      | undefined;

    await ctx.audit.write({
      action: AUDIT_ACTION.UPDATED,
      changes,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      newState,
      previousState,
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.UPDATED, { changes: changes ?? {}, draftId: id });

    return updated;
  });
