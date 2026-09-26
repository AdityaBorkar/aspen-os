import { serviceProvider } from "#/db-schemas";
import { SERVICE_PROVIDER_EVENTS } from "#/pubsub";
import { AttachLogoSchema, IssueLogoUploadUrlSchema } from "#/schemas/logo";
import { computeLogoKey, getLogoUploadUrl } from "#/services/logo-storage";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchServiceProviderStep } from "#/workflow-steps/fetch-sp";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";

/**
 * Issue a direct-to-Storage upload URL for a service-provider logo.
 */
export const issueServiceProviderLogoUploadUrl = Workflow.name("sp.logo.issue-upload-url")
  .input(IssueLogoUploadUrlSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchServiceProviderStep, { id: input.id });
    const key = computeLogoKey({
      fileName: input.fileName,
      ownerId: input.id,
      ownerType: "service-provider",
    });
    const uploadUrl = await ctx.step.run("issue-url", async () =>
      getLogoUploadUrl(key, input.contentType, input.expiresIn ?? 1800),
    );
    return { key, uploadUrl };
  });

/**
 * Attach an already-uploaded Storage key as the service-provider logo.
 */
export const attachServiceProviderLogo = Workflow.name("sp.logo.attach")
  .input(AttachLogoSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchServiceProviderStep, { id: input.id });
    const previous = current.logo;

    await ctx.step.run("store-reference", async () => {
      const [updated] = await ctx.db
        .update(serviceProvider)
        .set({ logo: input.storageKey, updated_at: new Date() })
        .where(eq(serviceProvider.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Service Provider with id "${input.id}" not found.`);
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
        action: AUDIT_ACTION.SP_LOGO_UPLOADED,
        crudAction: "update",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
        newState: { logo: input.storageKey },
      });
      await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.UPDATED, {
        changes: { logo: input.storageKey },
        serviceProvider: { id: input.id, name: current.name },
      });
    });

    return ctx.step.run(fetchServiceProviderStep, { id: input.id });
  });
