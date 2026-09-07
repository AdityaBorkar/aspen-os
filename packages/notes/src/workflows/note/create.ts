import { note } from "#/db-schemas";
import { NOTE_EVENTS } from "#/pubsub";
import { CreateNoteSchema } from "#/schemas";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { resolveOwnerId } from "#/workflow-steps/access-service";

import { Workflow } from "@aspen-os/platform/server";
import type { JsonValue } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateNoteSchema });

export const createNote = Workflow.name("notes.note.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const ownerId = await resolveOwnerId(ctx.actorId, input.ownerId, ctx.auth);

    const [created] = await ctx.db
      .insert(note)
      .values({
        access: input.access,
        body: input.body,
        metadata: input.metadata ?? {},
        ownerId,
        scopeId: input.scopeId ?? null,
        scopeType: input.scopeType ?? null,
        tags: input.tags,
        title: input.title ?? null,
        type: input.type,
      })
      .returning();

    if (!created) {
      throw new Error("Failed to create note.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: created.id,
        entityType: AUDIT_ENTITY_TYPE.NOTE,
        newState: { body: created.body, title: created.title, type: created.type },
      });

      await ctx.pubsub.publish(NOTE_EVENTS.CREATED, {
        note: {
          access: created.access,
          body: created.body,
          id: created.id,
          // SAFETY: metadata is written above from validated input (defaulting to {}), so the stored jsonb is a string-keyed object by construction.
          metadata: (created.metadata ?? {}) as Record<string, JsonValue>,
          ownerId: created.ownerId,
          scopeId: created.scopeId,
          scopeType: created.scopeType,
          tags: created.tags,
          title: created.title,
          type: created.type,
        },
      });
    });

    return created;
  });
