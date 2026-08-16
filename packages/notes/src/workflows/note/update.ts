import { note } from "#/db-schemas";
import { NOTE_EVENTS } from "#/pubsub";
import { assertCanMutate } from "#/services/access-service";
import { IdSchema, UpdateNoteSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchNoteStep } from "#/workflow-steps/fetch-note";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateNoteSchema });

export const updateNote = Workflow.name("notes.note.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const parsed = parse(UpdateNoteSchema, input);

    const existing = await ctx.step.run(fetchNoteStep, { id });

    await assertCanMutate(existing, ctx.actorId);

    const updates = stripUndefined({
      access: parsed.access,
      body: parsed.body,
      metadata: parsed.metadata,
      scopeId: parsed.scopeId ?? null,
      scopeType: parsed.scopeType ?? null,
      tags: parsed.tags,
      title: parsed.title ?? null,
      type: parsed.type,
    });

    const [updated] = await ctx.db
      .update(note)
      .set({ ...updates })
      .where(eq(note.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Note with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: parsed,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.NOTE,
        newState: { body: updated.body, title: updated.title, type: updated.type },
        previousState: { body: existing.body, title: existing.title, type: existing.type },
      });

      await ctx.pubsub.publish(NOTE_EVENTS.UPDATED, {
        changes: parsed,
        note: {
          access: updated.access,
          body: updated.body,
          id: updated.id,
          scopeId: updated.scopeId,
          scopeType: updated.scopeType,
          title: updated.title,
          type: updated.type,
        },
      });
    });

    return updated;
  });
