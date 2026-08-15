import { masterNote } from "#/db-schemas";
import { NOTE_EVENTS } from "#/pubsub";
import { CreateNoteSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateNoteSchema });

export const addNote = Workflow.name("masters.note.add")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateNoteSchema, input);

    const [note] = await ctx.db
      .insert(masterNote)
      .values({
        content: parsed.content,
        entityId: parsed.entityId,
        entityType: parsed.entityType,
        type: parsed.type,
        userId: parsed.userId,
      })
      .returning();

    if (!note) {
      throw new Error("Failed to add note.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: note.id,
        entityType: AUDIT_ENTITY_TYPE.NOTE,
        newState: { content: note.content, entityId: note.entityId, entityType: note.entityType },
      });

      await ctx.pubsub.publish(NOTE_EVENTS.ADDED, {
        entityId: note.entityId,
        entityType: note.entityType,
        note: {
          content: note.content,
          id: note.id,
          type: note.type,
        },
      });
    });

    return note;
  });
