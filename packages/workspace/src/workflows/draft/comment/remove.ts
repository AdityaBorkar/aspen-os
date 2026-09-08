import { workspaceDraftComment } from "#/db-schemas";
import { DRAFT_EVENTS } from "#/pubsub";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { isTenantAdmin } from "#/workflow-steps/access-service";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const RemoveInputSchema = object({ id: string() });

export const removeDraftComment = Workflow.name("workspace.draft.comment.remove")
  .input(RemoveInputSchema)
  .handler(async ({ id }, ctx) => {
    if (!ctx.actorId) {
      throw new Error("Authentication required");
    }

    const [comment] = await ctx.db
      .select()
      .from(workspaceDraftComment)
      .where(eq(workspaceDraftComment.id, id))
      .limit(1);

    if (!comment) {
      throw new Error(`Comment "${id}" not found.`);
    }

    const draft = await ctx.step.run(fetchDraftStep, { id: comment.draft_id });
    const isAuthor = comment.author_id === ctx.actorId;
    const isDraftOwner = draft.owner_id === ctx.actorId;
    const isAdmin = await isTenantAdmin(ctx.actorId);

    if (!isAuthor && !isDraftOwner && !isAdmin) {
      throw new Error("You do not have permission to remove this comment.");
    }

    await ctx.db.delete(workspaceDraftComment).where(eq(workspaceDraftComment.id, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.COMMENT_REMOVED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT_COMMENT,
      metadata: { draft_id: comment.draft_id },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.COMMENT_REMOVED, {
      commentId: id,
      draft_id: comment.draft_id,
    });

    return { id };
  });
