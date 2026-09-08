import { commsTemplate } from "#/db-schemas";
import { TEMPLATE_EVENTS } from "#/pubsub";
import { UpdateTemplateSchema } from "#/schemas/template";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { metadataEqual } from "#/utils/metadata";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchTemplateStep } from "#/workflow-steps/fetch-template";

import type { JsonValue } from "@aspen-os/platform/server";
import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const UpdateInputSchema = object({ input: UpdateTemplateSchema });

interface TemplatePatch {
  body?: string;
  metadata?: Record<string, JsonValue> | null;
  name?: string;
  providerTemplateId?: string | null;
  subject?: string | null;
}

export const updateTemplate = Workflow.name("comms.template.update")
  .input(UpdateInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchTemplateStep, { id: input.id });

    const set: TemplatePatch = {};
    if (input.body !== undefined && input.body !== current.body) {
      set.body = input.body;
    }
    if (input.name !== undefined && input.name !== current.name) {
      set.name = input.name;
    }
    if (input.providerTemplateId !== undefined) {
      const next = input.providerTemplateId ?? null;
      if (next !== current.provider_template_id) {
        set.providerTemplateId = next;
      }
    }
    if (input.subject !== undefined) {
      const next = input.subject ?? null;
      if (next !== current.subject) {
        set.subject = next;
      }
    }
    if (input.metadata !== undefined && !metadataEqual(input.metadata, current.metadata)) {
      set.metadata = input.metadata;
    }

    if (Object.keys(set).length === 0) {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsTemplate)
      .set({ ...set, updated_at: new Date() })
      .where(eq(commsTemplate.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Template with id "${input.id}" not found.`);
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.UPDATED,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.TEMPLATE,
      event: {
        payload: { is_active: updated.is_active, name: updated.name, templateId: updated.id },
        topic: TEMPLATE_EVENTS.UPDATED,
      },
      newState: { channel_type: updated.channel_type, name: updated.name },
    });

    return updated;
  });
