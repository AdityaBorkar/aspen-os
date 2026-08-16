import { note } from "#/db-schemas";
import { NoteFiltersSchema } from "#/types";

import { Workflow } from "@aspen-os/platform/server";
import { and, arrayOverlaps, desc, eq, ilike, or } from "drizzle-orm";
import { object, optional, parse } from "valibot";

const ListNotesSchema = object({
  filters: optional(NoteFiltersSchema),
});

export const listNotes = Workflow.name("notes.note.list")
  .input(ListNotesSchema)
  .handler(async ({ filters }, ctx) => {
    const parsed = parse(NoteFiltersSchema, filters ?? {});

    return ctx.step.run("query", async () => {
      if (!ctx.actorId) {
        throw new Error("Authentication required");
      }

      const conditions = [or(eq(note.access, "global"), eq(note.ownerId, ctx.actorId))];

      if (parsed.scopeType) {
        conditions.push(eq(note.scopeType, parsed.scopeType));
      }
      if (parsed.scopeId) {
        conditions.push(eq(note.scopeId, parsed.scopeId));
      }
      if (parsed.type) {
        conditions.push(eq(note.type, parsed.type));
      }
      if (parsed.tags && parsed.tags.length > 0) {
        conditions.push(arrayOverlaps(note.tags, parsed.tags));
      }
      if (parsed.search) {
        const pattern = `%${parsed.search}%`;
        conditions.push(or(ilike(note.title, pattern), ilike(note.body, pattern)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select()
        .from(note)
        .where(whereClause)
        .orderBy(desc(note.createdAt))
        .limit(parsed.limit ?? 50)
        .offset(parsed.offset ?? 0);
    });
  });
