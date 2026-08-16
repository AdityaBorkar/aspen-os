import { workspaceDraft, workspaceDraftComment } from "#/db-schemas";
import { DRAFT_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

const DeleteInputSchema = object({ id: string() });

export const deleteDraft = Workflow.name("workspace.draft.delete")
  .input(DeleteInputSchema)
  .handler(async ({ id }, ctx) => {
    const draft = await ctx.step.run(fetchDraftStep, { id });
    await assertCanMutate(draft, ctx.actorId);

    await ctx.step.run("delete-comments", async () => {
      await ctx.db.delete(workspaceDraftComment).where(eq(workspaceDraftComment.draftId, id));
    });

    await ctx.db.delete(workspaceDraft).where(eq(workspaceDraft.id, id));

    await ctx.audit.write({
      action: AUDIT_ACTION.DELETED,
      crudAction: "delete",
      entityId: id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.DELETED, { draftId: id });

    return { id };
  });
