import { workspaceDraft } from "#/db-schemas";
import { DRAFT_EVENTS } from "#/pubsub";
import { assertCanAccess, resolveActorId } from "#/services/access-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, WORKSPACE_ACCESS } from "#/utils/constants";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const DuplicateInputSchema = object({ id: IdSchema });

export const duplicateDraft = Workflow.name("workspace.draft.duplicate")
  .input(DuplicateInputSchema)
  .handler(async ({ id }, ctx) => {
    const draft = await ctx.step.run(fetchDraftStep, { id });
    assertCanAccess(draft, ctx.actorId);
    const ownerId = resolveActorId(ctx.actorId);

    const [duplicate] = await ctx.db
      .insert(workspaceDraft)
      .values({
        access: WORKSPACE_ACCESS.PERSONAL,
        body: draft.body,
        metadata: draft.metadata,
        notes: draft.notes,
        ownerId,
        targetDomain: draft.targetDomain,
        targetEntityId: null,
        targetEntityType: draft.targetEntityType,
        title: draft.title,
      })
      .returning();

    if (!duplicate) {
      throw new Error("Failed to duplicate draft.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.DUPLICATED,
      crudAction: "create",
      entityId: duplicate.id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      metadata: { sourceDraftId: id },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.DUPLICATED, { draftId: id, duplicateId: duplicate.id });

    return duplicate;
  });
