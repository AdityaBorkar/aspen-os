import { masterNote } from "#/db-schemas";
import { NOTE_EVENTS } from "#/pubsub";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchNoteStep } from "#/workflow-steps/fetch-note";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const removeNote = Workflow.name("masters.note.remove")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const note = await ctx.step.run(fetchNoteStep, { id: input.id });

    await ctx.db.delete(masterNote).where(eq(masterNote.id, input.id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: note.id,
        entityType: AUDIT_ENTITY_TYPE.NOTE,
      });

      await ctx.pubsub.publish(NOTE_EVENTS.REMOVED, {
        entityId: note.entityId,
        entityType: note.entityType,
        noteId: note.id,
      });
    });

    return { removed: true };
  });
