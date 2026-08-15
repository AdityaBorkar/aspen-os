import { connectionNote } from "#/db-schemas";
import type { ConnectionNoteType } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, optional, string } from "valibot";

function isConnectionNoteType(value: string): value is ConnectionNoteType {
  return (
    value === "call" ||
    value === "contract_renewal" ||
    value === "email" ||
    value === "general" ||
    value === "issue" ||
    value === "meeting"
  );
}

export const listNotes = Workflow.name("connection.list-notes")
  .input(
    object({
      connectionId: string(),
      type: optional(string()),
    }),
  )
  .handler(async (input, ctx) => {
    const conditions = [eq(connectionNote.connectionId, input.connectionId)];
    if (input.type && isConnectionNoteType(input.type)) {
      conditions.push(eq(connectionNote.type, input.type));
    }

    return ctx.db
      .select()
      .from(connectionNote)
      .where(and(...conditions))
      .orderBy(desc(connectionNote.createdAt));
  });
