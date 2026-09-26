import { serviceProvider } from "#/db-schemas";
import { SERVICE_PROVIDER_EVENTS } from "#/pubsub";
import { UploadLogoSchema } from "#/schemas/logo";
import { computeLogoKey, uploadLogoObject } from "#/services/logo-storage";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchServiceProviderStep } from "#/workflow-steps/fetch-sp";

import { Workflow } from "@aspen-os/platform/server";
import { eq } from "drizzle-orm";
import { is, string } from "valibot";

/**
 * Upload a service-provider logo through the Storage unit.
 *
 * Bytes are written to Storage under `logos/service-provider/<id>/<fileName>`
 * and the logical key is stored on `service_provider.logo`.
 */
export const uploadServiceProviderLogo = Workflow.name("sp.logo.upload")
  .input(UploadLogoSchema)
  .handler(async (input, ctx) => {
    const current = await ctx.step.run(fetchServiceProviderStep, { id: input.id });

    const { body } = input;
    if (!(body instanceof Buffer) && !(body instanceof ReadableStream) && !is(string(), body)) {
      throw new Error("Invalid logo body: expected a string, Buffer, or ReadableStream.");
    }

    const storageKey = computeLogoKey({
      fileName: input.fileName,
      ownerId: input.id,
      ownerType: "service-provider",
    });

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadLogoObject({
        body,
        contentType: input.contentType,
        key: storageKey,
        ownerId: input.id,
      }),
    );

    const previous = current.logo;

    await ctx.step.run("store-reference", async () => {
      const [updated] = await ctx.db
        .update(serviceProvider)
        .set({ logo: storageKey, updated_at: new Date() })
        .where(eq(serviceProvider.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Service Provider with id "${input.id}" not found.`);
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
        action: AUDIT_ACTION.SP_LOGO_UPLOADED,
        crudAction: "update",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.SERVICE_PROVIDER,
        newState: { logo: storageKey, size: fileObject.size },
      });
      await ctx.pubsub.publish(SERVICE_PROVIDER_EVENTS.UPDATED, {
        changes: { logo: storageKey },
        serviceProvider: { id: input.id, name: current.name },
      });
    });

    return ctx.step.run(fetchServiceProviderStep, { id: input.id });
  });
