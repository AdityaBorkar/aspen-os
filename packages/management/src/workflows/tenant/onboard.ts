import { tenant } from "#/db-schemas";
import type { NewTenant } from "#/db-schemas/tenant";
import { TENANT_EVENTS } from "#/pubsub";
import { IdSchema, ProvisionTenantSchema } from "#/types";
import type { ProvisionTenantInput } from "#/types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "#/utils/constants";
import { requireAuth } from "#/utils/require-auth";

import { Workflow } from "@aspen-os/platform/server";
import type { DatabaseUnit, TenantProvisioningResult } from "@aspen-os/platform/server";
import { organization } from "@aspen-os/platform/server/db-schemas";
import { eq } from "drizzle-orm";
import { object } from "valibot";

function tenantRecordColumns(
  tenantId: string,
  parsed: ProvisionTenantInput,
  provisioning: TenantProvisioningResult,
): NewTenant {
  const isolated = provisioning.tenancyMode === "isolated" ? provisioning : null;
  return {
    database_host: isolated?.host ?? null,
    database_name: isolated?.database ?? null,
    database_password: isolated?.password ?? null,
    database_port: isolated?.port ?? null,
    database_ssl: isolated?.ssl ?? null,
    database_user: isolated?.user ?? null,
    id: tenantId,
    plan: parsed.plan ?? null,
    service_provider_id: parsed.serviceProviderId ?? null,
    signup_at: new Date(),
    status: "onboarding",
  };
}

export function createOnboardTenant(dbUnit: DatabaseUnit) {
  return Workflow.name("tenant.onboard")
    .input(
      object({
        tenant: ProvisionTenantSchema,
        userId: IdSchema,
      }),
    )
    .handler(async (input, ctx) => {
      const auth = requireAuth(ctx);
      const parsed = input.tenant;

      const org = await ctx.step.run("create-organization", async () =>
        auth.service.api.createOrganization({
          body: {
            logo: parsed.logo ?? undefined,
            name: parsed.name,
            slug: parsed.slug,
            userId: input.userId,
          },
        }),
      );

      const tenantId = org.id;

      const provisioning = await ctx.step
        .run("provision-tenant", async () =>
          dbUnit.provisionTenant(tenantId, {
            databaseName: parsed.databaseName ?? undefined,
            host: parsed.databaseHost ?? undefined,
            password: parsed.databasePassword ?? undefined,
            port: parsed.databasePort ?? undefined,
            ssl: parsed.databaseSsl ?? undefined,
            user: parsed.databaseUser ?? undefined,
          }),
        )
        .catch(async (error) => {
          ctx.log.error(
            `Provisioning failed for tenant "${tenantId}", cleaning up organization`,
            error instanceof Error ? error : new Error(String(error)),
            { phase: "provision-tenant", tenantId },
          );
          try {
            await dbUnit.controlPlaneDb.delete(organization).where(eq(organization.id, tenantId));
          } catch (cleanupError) {
            ctx.log.error(
              `Failed to cleanup organization "${tenantId}"`,
              cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)),
              { phase: "cleanup-organization", tenantId },
            );
          }
          throw error;
        });

      if (provisioning.tenancyMode === "isolated") {
        await ctx.step.run("seed-profile", async () => {
          await dbUnit.seedTenantDb(provisioning, async (tenantDb) => {
            await tenantDb.insert(organization).values({
              created_at: new Date(),
              id: tenantId,
              logo: parsed.logo ?? null,
              name: parsed.name,
              slug: parsed.slug,
            });
          });
        });
      }

      await ctx.step.run("record-tenant", async () => {
        await ctx.db.insert(tenant).values(tenantRecordColumns(tenantId, parsed, provisioning));
      });

      await ctx.step.run("audit-and-notify", async () => {
        await ctx.audit.write({
          action: AUDIT_ACTION.TENANT_PROVISIONED,
          crudAction: "create",
          entityId: tenantId,
          entityType: AUDIT_ENTITY_TYPE.TENANT,
          newState: {
            name: parsed.name,
            plan: parsed.plan ?? null,
            serviceProviderId: parsed.serviceProviderId ?? null,
            slug: parsed.slug,
            status: "onboarding",
          },
        });

        await ctx.pubsub.publish(TENANT_EVENTS.PROVISIONED, {
          serviceProviderId: parsed.serviceProviderId ?? undefined,
          tenantId,
        });
      });

      return { tenantId };
    });
}
