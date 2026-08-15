import { masterNote } from "#/db-schemas";
import { ListNotesSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";

export const listNotes = Workflow.name("masters.note.list")
  .input(ListNotesSchema)
  .handler(async (input, ctx) =>
    ctx.step.run("query", async () => {
      const conditions = [
        eq(masterNote.entityType, input.entityType),
        eq(masterNote.entityId, input.entityId),
      ];

      if (input.type) {
        conditions.push(eq(masterNote.type, input.type));
      }

      return ctx.db
        .select()
        .from(masterNote)
        .where(and(...conditions))
        .orderBy(desc(masterNote.createdAt));
    }),
  );
