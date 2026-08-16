import { workspaceDraft } from "#/db-schemas";
import { DRAFT_EVENTS } from "#/pubsub";
import { assertCanMutate, resolveActorId } from "#/services/access-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { object } from "valibot";

const RestoreInputSchema = object({ id: IdSchema });

export const restoreDraft = Workflow.name("workspace.draft.restore")
  .input(RestoreInputSchema)
  .handler(async ({ id }, ctx) => {
    const draft = await ctx.step.run(fetchDraftStep, { id });
    await assertCanMutate(draft, ctx.actorId);
    const actorId = resolveActorId(ctx.actorId);

    const [updated] = await ctx.db
      .update(workspaceDraft)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(workspaceDraft.id, id), isNotNull(workspaceDraft.deletedAt)))
      .returning();

    if (!updated) {
      return draft;
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.RESTORED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      metadata: { by: actorId },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.RESTORED, { draftId: id });

    return updated;
  });
