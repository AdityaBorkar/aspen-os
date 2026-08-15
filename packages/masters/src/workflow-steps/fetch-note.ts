import { masterNote } from "#/db-schemas";

import { WorkflowStep } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, string } from "valibot";

export const fetchNoteStep = WorkflowStep.name("masters-fetch-note")
  .input(object({ id: string() }))
  .handler(async (input, ctx) => {
    const [result] = await ctx.db
      .select()
      .from(masterNote)
      .where(eq(masterNote.id, input.id))
      .limit(1);

    if (!result) {
      throw new Error(`Note with id "${input.id}" not found.`);
    }

    return result;
  });
