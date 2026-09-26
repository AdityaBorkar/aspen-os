import { TENANT_EVENTS } from "#/pubsub";
import { UploadLogoSchema } from "#/schemas/logo";
import { computeLogoKey, uploadLogoObject } from "#/services/logo-storage";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchTenantStep } from "#/workflow-steps/fetch-tenant";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { is, string } from "valibot";

/**
 * Upload a tenant logo through the Storage unit.
 *
 * Bytes are written to Storage under `logos/tenant/<id>/<fileName>` and the
 * returned logical key is stored on the better-auth `organization.logo`
 * column. The database holds only the Storage reference, never bytes or
 * external URLs. Resolves display URLs via `tenant.logoGetUrl`.
 */
export const uploadTenantLogo = Workflow.name("tenant.logo.upload")
  .input(UploadLogoSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchTenantStep, { id: input.id });

    const { body } = input;
    if (!(body instanceof Buffer) && !(body instanceof ReadableStream) && !is(string(), body)) {
      throw new Error("Invalid logo body: expected a string, Buffer, or ReadableStream.");
    }

    const storageKey = computeLogoKey({
      fileName: input.fileName,
      ownerId: input.id,
      ownerType: "tenant",
    });

    const fileObject = await ctx.step.run("upload-storage", async () =>
      uploadLogoObject({
        body,
        contentType: input.contentType,
        key: storageKey,
        ownerId: input.id,
      }),
    );

    const previous = await ctx.step.run("read-previous", async () => {
      const [row] = await ctx.db
        .select({ logo: organization.logo })
        .from(organization)
        .where(eq(organization.id, input.id))
        .limit(1);
      return row?.logo ?? null;
    });

    await ctx.step.run("store-reference", async () => {
      const [updated] = await ctx.db
        .update(organization)
        .set({ logo: storageKey })
        .where(eq(organization.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Tenant with id "${input.id}" not found.`);
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
        action: AUDIT_ACTION.TENANT_LOGO_UPLOADED,
        crudAction: "update",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { logo: storageKey, size: fileObject.size },
      });
      await ctx.pubsub.publish(TENANT_EVENTS.PROFILE_UPDATED, {
        changes: { logo: storageKey },
        tenantId: input.id,
      });
    });

    return ctx.step.run(fetchTenantStep, { id: input.id });
  });
