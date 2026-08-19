import { WithIdSchema } from "#/types";
import { assertCanAccess } from "#/workflow-steps/access-service";
import { fetchNoteStep } from "#/workflow-steps/fetch-note";

import { Workflow } from "@aspen-os/platform/server";

export const getNote = Workflow.name("notes.note.get")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const found = await ctx.step.run(fetchNoteStep, { id });

    assertCanAccess(found, ctx.actorId);

    return found;
  });
