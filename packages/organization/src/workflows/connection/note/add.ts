import { connectionNote } from "#/db-schemas";
import { CONNECTION_EVENTS } from "#/pubsub";
import { CreateConnectionNoteSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateConnectionNoteSchema });

export const addNote = Workflow.name("connection.add-note")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [result] = await ctx.db
      .insert(connectionNote)
      .values({
        connectionId: input.connectionId,
        content: input.content,
        type: input.type,
        userId: input.userId,
      })
      .returning();

    if (!result) {
      throw new Error("Failed to add note.");
    }

    await ctx.pubsub.publish(CONNECTION_EVENTS.NOTE_ADDED, {
      connectionId: input.connectionId,
      note: {
        content: result.content,
        id: result.id,
        type: result.type,
      },
    });

    return result;
  });
