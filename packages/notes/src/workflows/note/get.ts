import { assertCanAccess } from "#/workflow-steps/access-service";
import { fetchNoteStep } from "#/workflow-steps/fetch-note";

import { Workflow, WithIdSchema } from "@aspen-os/platform/server";

export const getNote = Workflow.name("notes.note.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const found = await ctx.step.run(fetchNoteStep, { id });

    await assertCanAccess(found, ctx.actorId, ctx.auth);

    return found;
  });
