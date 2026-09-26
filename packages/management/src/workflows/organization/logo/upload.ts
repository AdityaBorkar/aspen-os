import { managedOrganization } from "#/db-schemas";
import { ORGANIZATION_EVENTS } from "#/pubsub";
import { UploadLogoSchema } from "#/schemas/logo";
import { computeLogoKey, uploadLogoObject } from "#/services/logo-storage";
import { brandingWithLogo, readBrandingLogo } from "#/services/organization-branding";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchOrganizationStep } from "#/workflow-steps/fetch-organization";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, string } from "valibot";

/**
 * Upload a managed-organization logo through the Storage unit.
 *
 * Bytes are written to Storage under `logos/organization/<id>/<fileName>` and
 * the logical key is stored at `managed_organization.branding.logo`. The
 * database holds only the Storage reference.
 */
export const uploadOrganizationLogo = Workflow.name("organization.logo.upload")
  .input(UploadLogoSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchOrganizationStep, { id: input.id });

    const { body } = input;
    if (!(body instanceof Buffer) && !(body instanceof ReadableStream) && !is(string(), body)) {
      throw new Error("Invalid logo body: expected a string, Buffer, or ReadableStream.");
    }

    const storageKey = computeLogoKey({
      fileName: input.fileName,
      ownerId: input.id,
      ownerType: "organization",
    });

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadLogoObject({
        body,
        contentType: input.contentType,
        key: storageKey,
        ownerId: input.id,
      }),
    );

    const previous = readBrandingLogo(current.branding);

    await ctx.step.run("store-reference", async () => {
      const branding = brandingWithLogo(current.branding, storageKey);
      const [updated] = await ctx.db
        .update(managedOrganization)
        .set({ branding, updated_at: new Date() })
        .where(eq(managedOrganization.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Organization with id "${input.id}" not found.`);
      }
    });

    if (previous && previous !== storageKey) {
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
        newState: { logo: storageKey, size: fileObject.size },
      });
      await ctx.pubsub.publish(ORGANIZATION_EVENTS.UPDATED, {
        changes: { branding: { logo: storageKey } },
        organization: { id: input.id, name: current.name },
      });
    });

    return ctx.step.run(fetchOrganizationStep, { id: input.id });
  });
