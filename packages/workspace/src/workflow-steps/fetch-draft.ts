import { workspaceDraft } from "#/db-schemas";
import { IdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const fetchDraftStep = WorkflowStep.name("workspace-fetch-draft")
  .input(object({ id: IdSchema }))
  .handler(async (input, ctx) => {
    const [draft] = await ctx.db
      .select()
      .from(workspaceDraft)
      .where(eq(workspaceDraft.id, input.id))
      .limit(1);

    if (!draft) {
      throw new Error(`Draft with id "${input.id}" not found.`);
    }
    return draft;
  });
