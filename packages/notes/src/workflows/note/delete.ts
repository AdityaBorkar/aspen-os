import { note } from "#/db-schemas";
import { NOTE_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { WithIdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchNoteStep } from "#/workflow-steps/fetch-note";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const deleteNote = Workflow.name("notes.note.delete")
  .input(WithIdSchema)
  .handler(async ({ id }, ctx) => {
    const existing = await ctx.step.run(fetchNoteStep, { id });

    await assertCanMutate(existing, ctx.actorId);

    await ctx.db.delete(note).where(eq(note.id, id));

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DELETED,
        crudAction: "delete",
        entityId: existing.id,
        entityType: AUDIT_ENTITY_TYPE.NOTE,
      });

      await ctx.pubsub.publish(NOTE_EVENTS.DELETED, {
        note: {
          access: existing.access,
          body: existing.body,
          id: existing.id,
          scopeId: existing.scopeId,
          scopeType: existing.scopeType,
          title: existing.title,
          type: existing.type,
        },
      });
    });

    return { removed: true };
  });
