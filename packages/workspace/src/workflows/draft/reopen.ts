import { DRAFT_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, DRAFT_STATUS } from "#/utils/constants";
import { assertCanMutate, resolveActorId } from "#/workflow-steps/access-service";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";
import { transitionDraft } from "#/workflows/draft/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const ReopenInputSchema = object({ id: IdSchema });

export const reopenDraft = Workflow.name("workspace.draft.reopen")
  .input(ReopenInputSchema)
  .handler(async ({ id }, ctx) => {
    const draft = await ctx.step.run(fetchDraftStep, { id });
    await assertCanMutate(draft, ctx.actorId);
    const actorId = resolveActorId(ctx.actorId);

    const updated = await ctx.step.run("transition", async () =>
      transitionDraft(ctx.db, {
        fromStatuses: [DRAFT_STATUS.PUBLISHED, DRAFT_STATUS.REJECTED],
        id,
        toStatus: DRAFT_STATUS.DRAFT,
        values: {
          approved_at: null,
          approved_by: null,
          published_at: null,
          published_by: null,
          rejected_at: null,
          rejected_by: null,
          rejection_reason: null,
          submitted_at: null,
          submitted_by: null,
        },
      }),
    );

    await ctx.audit.write({
      action: AUDIT_ACTION.REOPENED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      metadata: { by: actorId },
      newState: { status: updated.status },
      previousState: { status: draft.status },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.REOPENED, { draftId: id });

    return updated;
  });
