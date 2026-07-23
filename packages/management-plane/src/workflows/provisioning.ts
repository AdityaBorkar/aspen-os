import { WorkflowStep } from "@aspen-os/framework/server";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { parse } from "valibot";

import type { ManagementPlaneConfig } from "..";
import { tenant } from "../db-schemas";
import { TENANT_EVENTS } from "../pubsub-events";
import type { ProvisioningInput } from "../types";
import { IdSchema, ProvisioningInputSchema } from "../types";

interface TenantDbConfig {
  database: string;
  host: string;
  password: string;
  port: number;
  ssl: boolean | { rejectUnauthorized: boolean };
  user: string;
}

function escapeIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function resolveDbConfig(
  config: ManagementPlaneConfig,
  parsed: ProvisioningInput,
  tenantId: string,
): TenantDbConfig {
  return {
    database: parsed.databaseName ?? config.tenantDbNamingScheme(tenantId),
    host: parsed.databaseHost ?? config.defaultTenantDbHost,
    password: parsed.databasePassword ?? config.defaultTenantDbPassword,
    port: parsed.databasePort ?? config.defaultTenantDbPort,
    ssl:
      (parsed.databaseSsl ?? config.defaultTenantDbSsl)
        ? { rejectUnauthorized: false }
        : false,
    user: parsed.databaseUser ?? config.defaultTenantDbUser,
  };
}

async function createDatabase(
  config: ManagementPlaneConfig,
  dbConfig: TenantDbConfig,
): Promise<void> {
  const adminPool = new pg.Pool({
    database: config.postgresAdminConnection.database,
    host: config.postgresAdminConnection.host,
    password: config.postgresAdminConnection.password,
    port: config.postgresAdminConnection.port,
    ssl: config.postgresAdminConnection.ssl
      ? { rejectUnauthorized: false }
      : false,
    user: config.postgresAdminConnection.user,
  });

  try {
    await adminPool.query(
      `CREATE DATABASE ${escapeIdentifier(dbConfig.database)}`,
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      return;
    }
    throw err;
  } finally {
    await adminPool.end();
  }
}

async function pushSchemas(
  config: ManagementPlaneConfig,
  dbConfig: TenantDbConfig,
): Promise<void> {
  const pool = new pg.Pool(dbConfig);
  const tenantDb = drizzle(pool);

  try {
    const { pushSchema } = await import("drizzle-kit/api");
    const allSchemas: Record<string, unknown> = {};
    for (const schema of Object.values(config.moduleSchemas)) {
      Object.assign(allSchemas, schema);
    }

    const result = await pushSchema(allSchemas, tenantDb);
    if (result.statementsToExecute.length > 0) {
      console.log(
        `[management-plane] Applying ${result.statementsToExecute.length} schema statements to new tenant DB`,
      );
      if (result.hasDataLoss) {
        console.warn(
          "[management-plane] Schema push has data loss warnings:",
          result.warnings,
        );
      }
      await result.apply();
      console.log("[management-plane] Tenant DB schema applied");
    }
  } finally {
    await pool.end();
  }
}

async function seedOrganizationProfile(
  dbConfig: TenantDbConfig,
  tenantId: string,
  parsed: ProvisioningInput,
): Promise<void> {
  const pool = new pg.Pool(dbConfig);

  try {
    await pool.query(
      "INSERT INTO organization (id, name, slug, logo) VALUES ($1, $2, $3, $4)",
      [tenantId, parsed.name, parsed.slug, parsed.logo ?? null],
    );
  } finally {
    await pool.end();
  }
}

export const provisionTenant = WorkflowStep.name("provision-tenant").handler(
  async (input: { tenant: ProvisioningInput; userId: string }, ctx) => {
    if (!ctx.auth) throw new Error("Auth is required for provisioning");
    const auth = ctx.auth;
    const config = ctx.config as ManagementPlaneConfig;
    const parsed = parse(ProvisioningInputSchema, input.tenant);
    const parsedUserId = parse(IdSchema, input.userId);

    const org = await ctx.step.run("create-organization", async () => {
      const api = auth.api as unknown as {
        createOrganization: (opts: unknown) => Promise<unknown>;
      };
      return (await api.createOrganization({
        body: {
          logo: parsed.logo ?? undefined,
          name: parsed.name,
          slug: parsed.slug,
          userId: parsedUserId,
        },
      } as Record<string, unknown>)) as { id: string };
    });

    const tenantId = org.id;

    const dbConfig = await ctx.step.run("resolve-db-config", async () => {
      return resolveDbConfig(config, parsed, tenantId);
    });

    await ctx.step.run("create-database", async () => {
      await createDatabase(config, dbConfig);
    });

    await ctx.step.run("push-schemas", async () => {
      await pushSchemas(config, dbConfig);
    });

    await ctx.step.run("seed-profile", async () => {
      await seedOrganizationProfile(dbConfig, tenantId, parsed);
    });

    await ctx.step.run("record-tenant", async () => {
      await ctx.db.insert(tenant).values({
        databaseHost: dbConfig.host,
        databaseName: dbConfig.database,
        databasePassword: dbConfig.password,
        databasePort: dbConfig.port,
        databaseSsl: Boolean(dbConfig.ssl),
        databaseUser: dbConfig.user,
        id: tenantId,
        plan: parsed.plan ?? null,
        serviceProviderId: parsed.serviceProviderId ?? null,
        signupAt: new Date(),
        status: "onboarding",
      });
    });

    if (parsed.serviceProviderId) {
      const spId = parsed.serviceProviderId;
      await ctx.step.run("assign-sp", async () => {
        await ctx.db
          .update(tenant)
          .set({
            serviceProviderId: spId,
            updatedAt: new Date(),
          })
          .where(eq(tenant.id, tenantId));
      });
    }

    await ctx.step.run("publish-event", async () => {
      await ctx.pubsub.publish(TENANT_EVENTS.PROVISIONED, {
        serviceProviderId: parsed.serviceProviderId ?? undefined,
        tenantId,
      });
    });

    return { tenantId };
  },
);
