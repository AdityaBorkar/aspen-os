import { DRAFT_EVENTS } from "#/pubsub";
import { assertCanMutate, resolveActorId } from "#/services/access-service";
import { PublishDraftSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, DRAFT_STATUS } from "#/utils/constants";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";
import { transitionDraft } from "#/workflows/draft/utils";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const PublishInputSchema = object({ input: PublishDraftSchema });

export const publishDraft = Workflow.name("workspace.draft.publish")
  .input(PublishInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(PublishDraftSchema, input);
    const draft = await ctx.step.run(fetchDraftStep, { id: parsed.id });
    await assertCanMutate(draft, ctx.actorId);
    const actorId = resolveActorId(ctx.actorId);

    const updated = await ctx.step.run("transition", async () =>
      transitionDraft(ctx.db, {
        fromStatuses: [DRAFT_STATUS.APPROVED, DRAFT_STATUS.DRAFT],
        id: parsed.id,
        toStatus: DRAFT_STATUS.PUBLISHED,
        values: {
          publishedAt: new Date(),
          publishedBy: actorId,
          targetDomain: parsed.targetDomain ?? draft.targetDomain,
          targetEntityId: parsed.targetEntityId ?? draft.targetEntityId,
          targetEntityType: parsed.targetEntityType ?? draft.targetEntityType,
        },
      }),
    );

    await ctx.audit.write({
      action: AUDIT_ACTION.PUBLISHED,
      crudAction: "update",
      entityId: parsed.id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      newState: { status: updated.status, targetEntityId: updated.targetEntityId },
      previousState: { status: draft.status },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.PUBLISHED, { draft: updated });

    return updated;
  });
