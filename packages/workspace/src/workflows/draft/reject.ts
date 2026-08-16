import { DRAFT_EVENTS } from "#/pubsub";
import { assertCanMutate, resolveActorId } from "#/services/access-service";
import { RejectDraftSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, DRAFT_STATUS } from "#/utils/constants";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";
import { transitionDraft } from "#/workflows/draft/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const RejectInputSchema = object({ input: RejectDraftSchema });

export const rejectDraft = Workflow.name("workspace.draft.reject")
  .input(RejectInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(RejectDraftSchema, input);
    const draft = await ctx.step.run(fetchDraftStep, { id: parsed.id });
    await assertCanMutate(draft, ctx.actorId);
    const actorId = resolveActorId(ctx.actorId);

    const updated = await ctx.step.run("transition", async () =>
      transitionDraft(ctx.db, {
        fromStatuses: [DRAFT_STATUS.SUBMITTED],
        id: parsed.id,
        toStatus: DRAFT_STATUS.REJECTED,
        values: {
          rejectedAt: new Date(),
          rejectedBy: actorId,
          rejectionReason: parsed.rejectionReason,
        },
      }),
    );

    await ctx.audit.write({
      action: AUDIT_ACTION.REJECTED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      metadata: { rejectionReason: parsed.rejectionReason },
      newState: { status: updated.status },
      previousState: { status: draft.status },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.REJECTED, {
      draftId: parsed.id,
      rejectedBy: actorId,
      rejectionReason: parsed.rejectionReason,
    });

    return updated;
  });
