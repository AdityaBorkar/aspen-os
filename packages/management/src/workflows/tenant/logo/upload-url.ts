import { TENANT_EVENTS } from "#/pubsub";
import { AttachLogoSchema, IssueLogoUploadUrlSchema } from "#/schemas/logo";
import { computeLogoKey, getLogoUploadUrl } from "#/services/logo-storage";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { fetchTenantStep } from "#/workflow-steps/fetch-tenant";

import { Workflow } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";

/**
 * Issue a direct-to-Storage upload URL for a tenant logo.
 *
 * The client PUTs bytes to `uploadUrl`, then calls `tenant.logoAttach` with
 * the returned `key`. The database stores only the Storage key.
 */
export const issueTenantLogoUploadUrl = Workflow.name("tenant.logo.issue-upload-url")
  .input(IssueLogoUploadUrlSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchTenantStep, { id: input.id });
    const key = computeLogoKey({
      fileName: input.fileName,
      ownerId: input.id,
      ownerType: "tenant",
    });
    const uploadUrl = await ctx.step.run("issue-url", async () =>
      getLogoUploadUrl(key, input.contentType, input.expiresIn ?? 1800),
    );
    return { key, uploadUrl };
  });

/**
 * Attach an already-uploaded Storage key as the tenant logo.
 *
 * Pair with `tenant.logoIssueUploadUrl`: upload bytes directly to Storage,
 * then persist the key reference on `organization.logo`.
 */
export const attachTenantLogo = Workflow.name("tenant.logo.attach")
  .input(AttachLogoSchema)
  .handler(async (input, ctx) => {
    await ctx.step.run(fetchTenantStep, { id: input.id });

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
        .set({ logo: input.storageKey })
        .where(eq(organization.id, input.id))
        .returning();
      if (!updated) {
        throw new Error(`Tenant with id "${input.id}" not found.`);
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
        action: AUDIT_ACTION.TENANT_LOGO_UPLOADED,
        crudAction: "update",
        entityId: input.id,
        entityType: AUDIT_ENTITY_TYPE.TENANT,
        newState: { logo: input.storageKey },
      });
      await ctx.pubsub.publish(TENANT_EVENTS.PROFILE_UPDATED, {
        changes: { logo: input.storageKey },
        tenantId: input.id,
      });
    });

    return ctx.step.run(fetchTenantStep, { id: input.id });
  });
