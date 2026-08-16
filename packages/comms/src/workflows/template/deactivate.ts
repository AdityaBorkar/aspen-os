import { commsTemplate } from "#/db-schemas";
import { TEMPLATE_EVENTS } from "#/pubsub";
import { IdSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchTemplateStep } from "#/workflow-steps/fetch-template";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

const DeactivateInputSchema = object({ input: object({ id: IdSchema }) });

export const deactivateTemplate = Workflow.name("comms.template.deactivate")
  .input(DeactivateInputSchema)
  .handler(async ({ input }, ctx) => {
    const current = await ctx.step.run(fetchTemplateStep, { id: input.id });
    if (!current.isActive) {
      return current;
    }

    const [updated] = await ctx.db
      .update(commsTemplate)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(commsTemplate.id, input.id))
      .returning();

    if (!updated) {
      throw new Error(`Template with id "${input.id}" not found.`);
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.DEACTIVATED,
        crudAction: "update",
        entityId: updated.id,
        entityType: AUDIT_ENTITY_TYPE.TEMPLATE,
      });

      await ctx.pubsub.publish(TEMPLATE_EVENTS.DEACTIVATED, {
        isActive: false,
        name: updated.name,
        templateId: updated.id,
      });
    });

    return updated;
  });
