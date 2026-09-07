import { commsTemplate } from "#/db-schemas";
import { TEMPLATE_EVENTS } from "#/pubsub";
import { CreateTemplateSchema } from "#/schemas/template";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";

import { Workflow } from "@aspen-os/platform/server";
import { object } from "valibot";

const CreateInputSchema = object({ input: CreateTemplateSchema });

export const createTemplate = Workflow.name("comms.template.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const [row] = await ctx.db
      .insert(commsTemplate)
      .values({
        body: input.body,
        channelType: input.channelType,
        metadata: input.metadata ?? null,
        name: input.name,
        providerTemplateId: input.providerTemplateId ?? null,
        subject: input.subject ?? null,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create template.");
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.CREATED,
      crudAction: "create",
      entityId: row.id,
      entityType: AUDIT_ENTITY_TYPE.TEMPLATE,
      event: {
        payload: { isActive: row.isActive, name: row.name, templateId: row.id },
        topic: TEMPLATE_EVENTS.CREATED,
      },
      newState: { channelType: row.channelType, name: row.name },
    });

    return row;
  });
