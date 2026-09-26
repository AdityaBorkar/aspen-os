import { managedOrganization } from "#/db-schemas";
import { ORGANIZATION_EVENTS } from "#/pubsub";
import { AttachLogoSchema, IssueLogoUploadUrlSchema } from "#/schemas/logo";
import { computeLogoKey, getLogoUploadUrl } from "#/services/logo-storage";
import { brandingWithLogo, readBrandingLogo } from "#/services/organization-branding";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOrganizationStep } from "#/workflow-steps/fetch-organization";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

/**
 * Issue a direct-to-Storage upload URL for a managed-organization logo.
 *
 * The client PUTs bytes to `uploadUrl`, then calls `organization.logoAttach`
 * with the returned `key`.
 */
export const issueOrganizationLogoUploadUrl = Workflow.name("organization.logo.issue-upload-url")
  .input(IssueLogoUploadUrlSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchOrganizationStep, { id: input.id });
    const key = computeLogoKey({
      fileName: input.fileName,
      ownerId: input.id,
      ownerType: "organization",
    });
    const uploadUrl = await ctx.step.run("issue-url", async () =>
      getLogoUploadUrl(key, input.contentType, input.expiresIn ?? 1800),
    );
    return { key, uploadUrl };
  });

/**
 * Attach an already-uploaded Storage key as the managed-organization logo.
 */
export const attachOrganizationLogo = Workflow.name("organization.logo.attach")
  .input(AttachLogoSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, { id: input.id });
    const previous = readBrandingLogo(current.branding);

    await ctx.step.run("store-reference", async () => {
      const branding = brandingWithLogo(current.branding, input.storageKey);
      const [updated] = await ctx.db
        .update(managedOrganization)
        .set({ branding, updated_at: new Date() })
        .where(eq(managedOrganization.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Organization with id "${input.id}" not found.`);
      }
    });

    if (previous && previous !== input.storageKey) {
      await ctx.step.run("remove-previous", async () => {
        const { removeLogoObject } = await import("#/services/logo-storage");
        await removeLogoObject(previous).catch(() => undefined);
      });
    }

    await ctx.step.run("audit-and-notify", async () => {
      await ctx.audit.write({
        action: AUDIT_ACTION.ORGANIZATION_LOGO_UPLOADED,
        crudAction: "update",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.ORGANIZATION,
        newState: { logo: input.storageKey },
      });
      await ctx.pubsub.publish(ORGANIZATION_EVENTS.UPDATED, {
        changes: { branding: { logo: input.storageKey } },
        organization: { id: input.id, name: current.name },
      });
    });

    return ctx.step.run(fetchOrganizationStep, { id: input.id });
  });
