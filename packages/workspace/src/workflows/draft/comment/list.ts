import { workspaceDraftComment } from "#/db-schemas";
import { assertCanAccess } from "#/services/access-service";
import { ListDraftCommentsSchema } from "#/types";
import { fetchDraftStep } from "#/workflow-steps/fetch-draft";

import { Workflow } from "@aspen-os/platform/server";
import { asc, eq } from "drizzle-orm";
import { object, parse } from "valibot";

const ListInputSchema = object({ input: ListDraftCommentsSchema });

export const listDraftComments = Workflow.name("workspace.draft.comment.list")
  .input(ListInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(ListDraftCommentsSchema, input);
    const draft = await ctx.step.run(fetchDraftStep, { id: parsed.draftId });
    assertCanAccess(draft, ctx.actorId);

    return ctx.db
      .select()
      .from(workspaceDraftComment)
      .where(eq(workspaceDraftComment.draftId, parsed.draftId))
      .orderBy(asc(workspaceDraftComment.createdAt))
      .limit(parsed.limit ?? 50)
      .offset(parsed.offset ?? 0);
  });
