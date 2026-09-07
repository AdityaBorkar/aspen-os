import { note } from "#/db-schemas";

import { WithIdSchema, WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

export const fetchNoteStep = WorkflowStep.name("notes-fetch-note")
  .input(WithIdSchema)
  .handler(async (input, ctx) => {
    const rows = await ctx.db.select().from(note).where(eq(note.id, input.id)).limit(1);
    const [row] = rows;
    if (!row) {
      throw new Error(`Note with id "${input.id}" not found.`);
    }
    return row;
  });
