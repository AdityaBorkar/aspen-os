import { note } from "#/db-schemas";
import { NoteFiltersSchema } from "#/schemas";
import { NOTES_ACCESS } from "#/utils/constants";
import { isTenantAdmin, requireActorId } from "#/workflow-steps/access-service";

import { Workflow } from "@aspen-os/platform/server";
import { and, arrayOverlaps, desc, eq, ilike, or } from "drizzle-orm";
import { object, optional } from "valibot";

const ListNotesSchema = object({
  filters: optional(NoteFiltersSchema, {}),
});

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export const listNotes = Workflow.name("notes.note.list")
  .input(ListNotesSchema)
  .handler(async ({ filters }, ctx) => {
    const actor = requireActorId(ctx.actorId);
    const admin = await isTenantAdmin(actor, ctx.auth);

    return ctx.step.run("query", async () => {
      const conditions = [];

      if (!admin) {
        conditions.push(or(eq(note.access, NOTES_ACCESS.GLOBAL), eq(note.owner_id, actor)));
      }

      if (filters.scopeType) {
        conditions.push(eq(note.scope_type, filters.scopeType));
      }
      if (filters.scopeId) {
        conditions.push(eq(note.scope_id, filters.scopeId));
      }
      if (filters.type) {
        conditions.push(eq(note.type, filters.type));
      }
      if (filters.tags?.length) {
        conditions.push(arrayOverlaps(note.tags, filters.tags));
      }
      if (filters.search) {
        const pattern = `%${escapeLikePattern(filters.search)}%`;
        conditions.push(or(ilike(note.title, pattern), ilike(note.body, pattern)));
      }

      const whereClause = and(...conditions);

      return ctx.db
        .select()
        .from(note)
        .where(whereClause)
        .orderBy(desc(note.created_at))
        .limit(filters.limit)
        .offset(filters.offset);
    });
  });
