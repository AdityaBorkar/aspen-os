import { commsTemplate } from "#/db-schemas";
import { TEMPLATE_EVENTS } from "#/pubsub";
import { UpdateTemplateSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchTemplateStep } from "#/workflow-steps/fetch-template";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object, parse } from "valibot";

const UpdateInputSchema = object({ input: UpdateTemplateSchema });

export const updateTemplate = Workflow.name("comms.template.update")
  .input(UpdateInputSchema)
  .handler(async ({ input }, ctx) => {
    const parsed = parse(UpdateTemplateSchema, input);
    const current = await ctx.step.run(fetchTemplateStep, { id: parsed.id });

    const [updated] = await ctx.db
      .update(commsTemplate)
      .set({
        body: parsed.body ?? current.body,
        metadata: parsed.metadata ?? current.metadata,
        name: parsed.name ?? current.name,
        providerTemplateId: parsed.providerTemplateId ?? current.providerTemplateId,
        subject: parsed.subject ?? current.subject,
        updatedAt: new Date(),
      })
      .where(eq(commsTemplate.id, parsed.id))
      .returning();

    if (!updated) {
      throw new Error(`Template with id "${parsed.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.UPDATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.TEMPLATE,
        newState: { channelType: updated.channelType, name: updated.name },
      });

      await ctx.pubsub.publish(TEMPLATE_EVENTS.UPDATED, {
        isActive: updated.isActive,
        name: updated.name,
        templateId: updated.id,
      });
    });

    return updated;
  });
