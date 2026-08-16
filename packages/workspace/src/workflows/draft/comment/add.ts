import { workspaceDraftComment } from "#/db-schemas";
import { DRAFT_EVENTS } from "#/pubsub";
import { assertCanAccess, resolveActorId } from "#/services/access-service";
import { CreateDraftCommentSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const AddInputSchema = object({ input: CreateDraftCommentSchema });

export const addDraftComment = Workflow.name("workspace.draft.comment.add")
  .input(AddInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDraftCommentSchema, input);
    const draft = await ctx.step.run(fetchDraftStep, { id: parsed.draftId });
    assertCanAccess(draft, ctx.actorId);
    const authorId = resolveActorId(ctx.actorId);

    const [comment] = await ctx.db
      .insert(workspaceDraftComment)
      .values({ authorId, content: parsed.content, draftId: parsed.draftId })
      .returning();

    if (!comment) {
      throw new Error("Failed to add comment.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.COMMENTED,
      crudAction: "create",
      entityId: comment.id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT_COMMENT,
      metadata: { draftId: parsed.draftId },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.COMMENTED, {
      authorId,
      commentId: comment.id,
      draftId: parsed.draftId,
    });

    return comment;
  });
