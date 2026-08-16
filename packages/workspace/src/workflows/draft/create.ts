import { workspaceDraft } from "#/db-schemas";
import { DRAFT_EVENTS } from "#/pubsub";
import { resolveActorId } from "#/services/access-service";
import { CreateDraftSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateDraftSchema });

export const createDraft = Workflow.name("workspace.draft.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateDraftSchema, input);
    const ownerId = resolveActorId(ctx.actorId, parsed.ownerId);

    const [draft] = await ctx.db
      .insert(workspaceDraft)
      .values({
        access: parsed.access ?? "personal",
        body: parsed.body ?? "",
        metadata: parsed.metadata ?? {},
        notes: parsed.notes ?? null,
        ownerId,
        targetDomain: parsed.targetDomain ?? null,
        targetEntityId: parsed.targetEntityId ?? null,
        targetEntityType: parsed.targetEntityType ?? null,
        title: parsed.title,
      })
      .returning();

    if (!draft) {
      throw new Error("Failed to create draft.");
    }

    await ctx.audit.write({
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: draft.id,
      entityType: AUDIT_ENTITY_TYPE.DRAFT,
      newState: { status: draft.status, title: draft.title },
    });

    await ctx.pubsub.publish(DRAFT_EVENTS.CREATED, {
      access: draft.access,
      draftId: draft.id,
      ownerId: draft.ownerId,
    });

    return draft;
  });
