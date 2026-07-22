import type { AuthUnit, PubSubUnit } from "@aspen-os/framework/server";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { parse } from "valibot";

import { tenant } from "../db-schema";
import { TENANT_EVENTS } from "../event-map";
import type { ManagementPlaneConfig, ProvisioningInput } from "../types";
import { ProvisioningInputSchema } from "../types";

type DB = NodePgDatabase<Record<string, never>>;

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

export class ProvisioningWorkflow {
  constructor(
    private readonly db: DB,
    private readonly auth: AuthUnit,
    private readonly pubsub: PubSubUnit,
    private readonly config: ManagementPlaneConfig,
  ) {}

  async provision(
    input: ProvisioningInput,
    userId: string,
  ): Promise<{ tenantId: string }> {
    const parsed = parse(ProvisioningInputSchema, input);

    const org = await this.createOrganization(parsed, userId);
    const tenantId = org.id;

    const dbConfig = this.resolveDbConfig(parsed, tenantId);

    await this.createDatabase(dbConfig);
    await this.pushSchemas(dbConfig);
    await this.seedOrganizationProfile(dbConfig, tenantId, parsed);
    await this.recordTenant(tenantId, parsed, dbConfig);

    if (parsed.serviceProviderId) {
      await this.assignSp(tenantId, parsed.serviceProviderId);
    }

    await this.pubsub.publish(TENANT_EVENTS.PROVISIONED, {
      serviceProviderId: parsed.serviceProviderId ?? undefined,
      tenantId,
    });

    return { tenantId };
  }

  private async createOrganization(
    parsed: ProvisioningInput,
    userId: string,
  ): Promise<{ id: string }> {
    const api = this.auth.api as unknown as {
      createOrganization: (opts: unknown) => Promise<unknown>;
    };
    const response = (await api.createOrganization({
      body: {
        logo: parsed.logo ?? undefined,
        name: parsed.name,
        slug: parsed.slug,
        userId,
      },
    } as Record<string, unknown>)) as { id: string };

    return response;
  }

  private resolveDbConfig(
    parsed: ProvisioningInput,
    tenantId: string,
  ): TenantDbConfig {
    return {
      database:
        parsed.databaseName ?? this.config.tenantDbNamingScheme(tenantId),
      host: parsed.databaseHost ?? this.config.defaultTenantDbHost,
      password: parsed.databasePassword ?? this.config.defaultTenantDbPassword,
      port: parsed.databasePort ?? this.config.defaultTenantDbPort,
      ssl:
        (parsed.databaseSsl ?? this.config.defaultTenantDbSsl)
          ? { rejectUnauthorized: false }
          : false,
      user: parsed.databaseUser ?? this.config.defaultTenantDbUser,
    };
  }

  private async createDatabase(dbConfig: TenantDbConfig): Promise<void> {
    const adminPool = new pg.Pool({
      database: this.config.postgresAdminConnection.database,
      host: this.config.postgresAdminConnection.host,
      password: this.config.postgresAdminConnection.password,
      port: this.config.postgresAdminConnection.port,
      ssl: this.config.postgresAdminConnection.ssl
        ? { rejectUnauthorized: false }
        : false,
      user: this.config.postgresAdminConnection.user,
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

  private async pushSchemas(dbConfig: TenantDbConfig): Promise<void> {
    const pool = new pg.Pool(dbConfig);
    const tenantDb = drizzle(pool);

    try {
      const { pushSchema } = await import("drizzle-kit/api");
      const allSchemas: Record<string, unknown> = {};
      for (const schema of Object.values(this.config.moduleSchemas)) {
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

  private async seedOrganizationProfile(
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

  private async recordTenant(
    tenantId: string,
    parsed: ProvisioningInput,
    dbConfig: TenantDbConfig,
  ): Promise<void> {
    await this.db.insert(tenant).values({
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
  }

  private async assignSp(tenantId: string, spId: string): Promise<void> {
    await this.db
      .update(tenant)
      .set({ serviceProviderId: spId, updatedAt: new Date() })
      .where(eq(tenant.id, tenantId));
  }
}
