import { connectionNote } from "#/db-schemas";

import { Workflow } from "@aspen-os/platform/server";
import { and, desc, eq } from "drizzle-orm";
import { object, optional, string } from "valibot";

export const listNotes = Workflow.name("connection.list-notes")
  .input(
    object({
      connectionId: string(),
      type: optional(string()),
    }),
  )
  .handler(async (input, ctx) => {
    const conditions = [eq(connectionNote.connectionId, input.connectionId)];
    if (input.type) {
      conditions.push(
        eq(
          connectionNote.type,
          input.type as "call" | "contract_renewal" | "email" | "general" | "issue" | "meeting",
        ),
      );
    }

    return ctx.db
      .select()
      .from(connectionNote)
      .where(and(...conditions))
      .orderBy(desc(connectionNote.createdAt));
  });
