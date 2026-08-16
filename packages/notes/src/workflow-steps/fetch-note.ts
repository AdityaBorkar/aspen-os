import { note } from "#/db-schemas";
import { WithIdSchema } from "#/types";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const fetchNoteStep = WorkflowStep.name("notes-fetch-note")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const [row] = await ctx.db.select().from(note).where(eq(note.id, input.id)).limit(1);
    if (!row) {
      throw new Error(`Note with id "${input.id}" not found.`);
    }
    return row;
  });
