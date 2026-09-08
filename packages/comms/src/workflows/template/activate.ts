import { commsTemplate } from "#/db-schemas";
import { TEMPLATE_EVENTS } from "#/pubsub";
import { IdSchema } from "#/schemas/utils";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { auditAndPublish } from "#/workflow-steps/audit";
import { fetchTemplateStep } from "#/workflow-steps/fetch-template";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const ActivateInputSchema = object({ input: object({ id: IdSchema }) });

export const activateTemplate = Workflow.name("comms.template.activate")
  .input(ActivateInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchTemplateStep, { id: input.id });
    if (current.is_active) {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsTemplate)
      .set({ is_active: true, updated_at: new Date() })
      .where(eq(commsTemplate.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Template with id "${input.id}" not found.`);
    }

    await auditAndPublish(ctx, {
      action: AUDIT_ACTION.ACTIVATED,
      crudAction: "update",
      entityId: updated.id,
      entityType: AUDIT_ENTITY_TYPE.TEMPLATE,
      event: {
        payload: { isActive: true, name: updated.name, templateId: updated.id },
        topic: TEMPLATE_EVENTS.ACTIVATED,
      },
    });

    return updated;
  });
