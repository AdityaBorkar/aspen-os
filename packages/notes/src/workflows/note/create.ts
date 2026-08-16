import { note } from "#/db-schemas";
import { NOTE_EVENTS } from "#/pubsub";
import { resolveActorId } from "#/services/access-service";
import { CreateNoteSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateNoteSchema });

export const createNote = Workflow.name("notes.note.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateNoteSchema, input);

    const ownerId = resolveActorId(ctx.actorId, parsed.ownerId);

    const [created] = await ctx.db
      .insert(note)
      .values({
        access: parsed.access,
        body: parsed.body,
        metadata: parsed.metadata ?? {},
        ownerId,
        scopeId: parsed.scopeId ?? null,
        scopeType: parsed.scopeType ?? null,
        tags: parsed.tags ?? [],
        title: parsed.title ?? null,
        type: parsed.type,
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
          scopeId: created.scopeId,
          scopeType: created.scopeType,
          title: created.title,
          type: created.type,
        },
      });
    });

    return created;
  });
