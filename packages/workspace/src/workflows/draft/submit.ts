import { DRAFT_EVENTS } from "#/pubsub";
import { assertCanMutate, resolveActorId } from "#/services/access-service";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, DRAFT_STATUS } from "#/utils/constants";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";
import { transitionDraft } from "#/workflows/draft/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const SubmitInputSchema = object({ id: IdSchema });

export const submitDraft = Workflow.name("workspace.draft.submit")
  .input(SubmitInputSchema)
  .handler(async ({ id }, ctx) => {
    const draft = await ctx.step.run(fetchDraftStep, { id });
    await assertCanMutate(draft, ctx.actorId);
    const actorId = resolveActorId(ctx.actorId);

    const updated = await ctx.step.run("transition", async () =>
      transitionDraft(ctx.db, {
        fromStatuses: [DRAFT_STATUS.DRAFT],
        id,
        toStatus: DRAFT_STATUS.SUBMITTED,
        values: {
          submittedAt: new Date(),
          submittedBy: actorId,
        },
      }),
    );

    await ctx.audit.write({
      action: AUDIT_ACTION.SUBMITTED,
      crudAction: "update",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      newState: { status: updated.status },
      previousState: { status: draft.status },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.SUBMITTED, { draftId: id, submittedBy: actorId });

    return updated;
  });
