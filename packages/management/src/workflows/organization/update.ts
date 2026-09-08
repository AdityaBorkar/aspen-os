import { managedOrganization } from "#/db-schemas";
import { ORGANIZATION_EVENTS } from "#/pubsub";
import { IdSchema, UpdateOrganizationSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { stripUndefined } from "#/utils/strip-undefined";
import { fetchOrganizationStep } from "#/workflow-steps/fetch-organization";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { object } from "valibot";

export const updateOrganization = Workflow.name("organization.update")
  .input(
    object({
      id: IdSchema,
      patch: UpdateOrganizationSchema,
    }),
  )
  .handler(async (input, ctx) => {
    const { id, patch } = input;
    await ctx.step.run(fetchOrganizationStep, { id });

    const data = stripUndefined(patch);
    if (Object.keys(data).length === 0) {
      return ctx.step.run(fetchOrganizationStep, { id });
    }

    await ctx.step.run("update-record", async () => {
      await ctx.db
        .update(managedOrganization)
        .set({ ...data, updated_at: new Date() })
        .where(eq(managedOrganization.id, id));
    });

    const updated = await ctx.step.run(fetchOrganizationStep, { id });

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ORGANIZATION_UPDATED,
        changes: data,
        crudAction: "update",
        entityId: id,
        entityType: AUDIT_ENTITY_TYPE.ORGANIZATION,
      });

      await ctx.pubsub.publish(ORGANIZATION_EVENTS.UPDATED, {
        changes: data,
        organization: { id, name: updated.name },
      });
    });

    return updated;
  });
