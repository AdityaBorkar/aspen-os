import { managedOrganization } from "#/db-schemas";
import { ORGANIZATION_EVENTS } from "#/pubsub";
import { CreateOrganizationSchema } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";

import { Workflow } from "@aspen-os/platform/server";

export const createOrganization = Workflow.name("organization.create")
  .input(CreateOrganizationSchema)
  .handler(async (input, ctx) => {
    const [result] = await ctx.step.run("create-record", () =>
      ctx.db
        .insert(managedOrganization)
        .values({
          branding: input.branding ?? null,
          name: input.name,
          slug: input.slug,
        })
        .returning(),
    );

    if (!result) {
      throw new Error("Failed to create organization.");
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ORGANIZATION_CREATED,
        crudAction: "create",
        entityId: result.id,
        entityType: AUDIT_ENTITY_TYPE.ORGANIZATION,
        newState: { branding: result.branding, name: result.name, slug: result.slug },
      });

      await ctx.pubsub.publish(ORGANIZATION_EVENTS.CREATED, {
        organization: {
          branding: result.branding,
          id: result.id,
          name: result.name,
          slug: result.slug,
        },
      });
    });

    return result;
  });
