import {
  type DatabaseUnit,
  type IsolatedTenantProvisioningResult,
  Workflow,
} from "@aspen-os/platform/server";
import { object } from "valibot";

import { organization, tenant } from "../db-schemas";
import { TENANT_EVENTS } from "../pubsub";
import { IdSchema, ProvisionTenantSchema } from "../types";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "../utils/constants";

export function createOnboardTenant(dbUnit: DatabaseUnit) {
  return Workflow.name("tenant.onboard")
    .input(
      object({
        tenant: ProvisionTenantSchema,
        userId: IdSchema,
      }),
    )
    .handler(async (input, ctx) => {
      if (!ctx.auth) throw new Error("Auth is required for provisioning");
      const auth = ctx.auth;
      const parsed = input.tenant;

      const org = await ctx.step.run("create-organization", async () => {
        return auth.service.api.createOrganization({
          body: {
            logo: parsed.logo ?? undefined,
            name: parsed.name,
            slug: parsed.slug,
            userId: input.userId,
          },
        });
      });

      const tenantId = org.id;

      let provisioningResult: Awaited<
        ReturnType<DatabaseUnit["provisionTenant"]>
      >;

      try {
        provisioningResult = await ctx.step.run(
          "provision-tenant",
          async () => {
            return dbUnit.provisionTenant(tenantId, {
              databaseName: parsed.databaseName ?? undefined,
              host: parsed.databaseHost ?? undefined,
              password: parsed.databasePassword ?? undefined,
              port: parsed.databasePort ?? undefined,
              ssl: parsed.databaseSsl ?? undefined,
              user: parsed.databaseUser ?? undefined,
            });
          },
        );
      } catch (err) {
        console.error(
          `Provisioning failed for tenant "${tenantId}", cleaning up organization`,
          err,
        );
        try {
          await auth.service.api.deleteOrganization({
            body: { organizationId: tenantId },
            headers: new Headers(),
          });
        } catch (cleanupErr) {
          console.error(
            `Failed to cleanup organization "${tenantId}"`,
            cleanupErr,
          );
        }
        throw err;
      }

      if (provisioningResult.tenancyMode === "isolated") {
        const dbConfig = provisioningResult as IsolatedTenantProvisioningResult;
        await ctx.step.run("seed-profile", async () => {
          await dbUnit.seedTenantDb(dbConfig, async (tenantDb) => {
            await tenantDb.insert(organization).values({
              createdAt: new Date(),
              id: tenantId,
              logo: parsed.logo ?? null,
              name: parsed.name,
              slug: parsed.slug,
            });
          });
        });
      }

      await ctx.step.run("record-tenant", async () => {
        await ctx.db.insert(tenant).values({
          databaseHost:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.database
              : null,
          databaseName:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.database
              : null,
          databasePassword:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.password
              : null,
          databasePort:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.port
              : null,
          databaseSsl:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.ssl
              : null,
          databaseUser:
            provisioningResult.tenancyMode === "isolated"
              ? provisioningResult.user
              : null,
          id: tenantId,
          plan: parsed.plan ?? null,
          serviceProviderId: parsed.serviceProviderId ?? null,
          signupAt: new Date(),
          status: "onboarding",
        });
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
