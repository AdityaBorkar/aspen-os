import { commsTemplate } from "#/db-schemas";
import { TEMPLATE_EVENTS } from "#/pubsub";
import { CreateTemplateSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";
import { object, parse } from "valibot";

const CreateInputSchema = object({ input: CreateTemplateSchema });

export const createTemplate = Workflow.name("comms.template.create")
  .input(CreateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(CreateTemplateSchema, input);

    const [row] = await ctx.db
      .insert(commsTemplate)
      .values({
        body: parsed.body,
        channelType: parsed.channelType,
        metadata: parsed.metadata ?? null,
        name: parsed.name,
        providerTemplateId: parsed.providerTemplateId ?? null,
        subject: parsed.subject ?? null,
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create template.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.CREATED,
        crudAction: "create",
        entityId: row.id,
        entityType: AUDIT_ENTITY_TYPE.TEMPLATE,
        newState: { channelType: row.channelType, name: row.name },
      });

      await ctx.pubsub.publish(TEMPLATE_EVENTS.CREATED, {
        isActive: row.isActive,
        name: row.name,
        templateId: row.id,
      });
    });

    return row;
  });
