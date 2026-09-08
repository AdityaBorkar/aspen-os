import { note } from "#/db-schemas";
import { NOTE_EVENTS } from "#/pubsub";
import { UpdateNoteSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { assertCanMutate } from "#/workflow-steps/access-service";
import { fetchNoteStep } from "#/workflow-steps/fetch-note";

import { Workflow, IdSchema } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({ id: IdSchema, input: UpdateNoteSchema });

export const updateNote = Workflow.name("notes.note.update")
  .input(UpdateInputSchema)
  .handler(async ({ id, input }, ctx) => {
    const existing = await ctx.step.run(fetchNoteStep, { id });

    await assertCanMutate(existing, ctx.actorId, ctx.auth);

    const updates = stripUndefined({
      access: input.access,
      body: input.body,
      metadata: input.metadata,
      scopeId: input.scopeId,
      scopeType: input.scopeType,
      tags: input.tags,
      title: input.title,
      type: input.type,
    });

    if (Object.keys(updates).length === 0) {
      throw new Error("Nothing to update: provide at least one field in input.");
    }

    // Metadata is replaced wholesale, not merged; callers send the full map.
    const [updated] = await ctx.db.update(note).set(updates).where(eq(note.id, id)).returning();

    if (!updated) {
      throw new Error(`Note with id "${id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        changes: updates,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.NOTE,
        newState: { body: updated.body, title: updated.title, type: updated.type },
        previousState: { body: existing.body, title: existing.title, type: existing.type },
      });

      await ctx.pubsub.publish(NOTE_EVENTS.UPDATED, {
        changes: updates,
        note: {
          access: updated.access,
          body: updated.body,
          id: updated.id,
          // SAFETY: metadata is written above from validated input, so the stored jsonb is a string-keyed object by construction.
          metadata: (updated.metadata ?? {}) as Record<string, JsonValue>,
          ownerId: updated.owner_id,
          scopeId: updated.scope_id,
          scopeType: updated.scope_type,
          tags: updated.tags,
          title: updated.title,
          type: updated.type,
        },
      });
    });

    return updated;
  });
