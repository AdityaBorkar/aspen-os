import { workspaceDraft } from "#/db-schemas";
import { DRAFT_EVENTS } from "#/pubsub";
import { assertCanMutate, resolveActorId } from "#/services/access-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNull } from "drizzle-orm";
import { object } from "valibot";

const TrashInputSchema = object({ id: IdSchema });

export const trashDraft = Workflow.name("workspace.draft.trash")
  .input(TrashInputSchema)
  .handler(async ({ id }, ctx) => {
    const draft = await ctx.step.run(fetchDraftStep, { id });
    await assertCanMutate(draft, ctx.actorId);
    const actorId = resolveActorId(ctx.actorId);

    if (draft.deletedAt) {
      return draft;
    }

    const [updated] = await ctx.db
      .update(workspaceDraft)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(workspaceDraft.id, id), isNull(workspaceDraft.deletedAt)))
      .returning();

    if (!updated) {
      throw new Error(`Draft "${id}" not found.`);
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.TRASHED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      metadata: { by: actorId },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.TRASHED, { draftId: id });

    return updated;
  });
