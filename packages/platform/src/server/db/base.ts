import { join } from "node:path";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as authSchema from "../auth/db-schema";
import { context } from "../context";
import type { TenancyMode, TenantResolver } from "../index";
import * as kvStoreSchema from "../kv-store/db-schema";
import * as logSchema from "../log/db-schema";
import * as storageSchema from "../storage/db-schema";
import * as workflowSchema from "../workflows/db-schema";
import type { DatabaseConfig, TenantProvisioningResult } from "./types";

type DrizzleDB = NodePgDatabase<Record<string, never>>;

export abstract class BaseDatabaseUnit {
  readonly $name = "db";
  readonly config: DatabaseConfig;
  readonly tenancyMode: TenancyMode;
  readonly resolver: TenantResolver | undefined;

  protected controlPlanePool: pg.Pool;
  protected controlPlaneDbInstance: DrizzleDB;
  protected storedControlPlaneSchemas: Record<string, unknown> = {};
  protected storedTenantSchemas: Record<string, unknown> = {};

  private dbWrapper: DrizzleDB;

  constructor(config: DatabaseConfig, tenancyMode: TenancyMode) {
    this.config = config;
    this.tenancyMode = tenancyMode;
    this.resolver = undefined;

    this.controlPlanePool = new pg.Pool({
      database: config.database,
      host: config.host,
      max: config.maxConnections ?? 20,
      password: config.password,
      port: config.port,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      user: config.user,
    });
    this.controlPlaneDbInstance = drizzle(this.controlPlanePool);

    this.dbWrapper = this.createDbWrapper();
  }

  get db(): DrizzleDB {
    return this.dbWrapper;
  }

  get controlPlaneDb(): DrizzleDB {
    return this.controlPlaneDbInstance;
  }

  get pool(): pg.Pool {
    return this.controlPlanePool;
  }

  async $prepareInfra() {
    const schemas = this.getSchemas();
    await this.pushSchemasTo(this.controlPlaneDbInstance, schemas);
  }

  async prepareWithModules(
    controlPlaneSchemas: Record<string, unknown>,
    tenantSchemas: Record<string, unknown>,
  ): Promise<void> {
    this.storedControlPlaneSchemas = controlPlaneSchemas;
    this.storedTenantSchemas = tenantSchemas;
    const allControlPlaneSchemas = {
      ...this.getSchemas(),
      ...controlPlaneSchemas,
    };
    await this.pushSchemasTo(
      this.controlPlaneDbInstance,
      allControlPlaneSchemas,
    );
  }

  async $cleanup() {
    await this.controlPlanePool.end();
  }

  async getTenantDb(_tenantId: string): Promise<DrizzleDB> {
    throw new Error("getTenantDb is only available in isolated tenancy mode");
  }

  async provisionTenant(
    _tenantId: string,
    _options?: {
      databaseName?: string;
      host?: string;
      password?: string;
      port?: number;
      ssl?: boolean;
      user?: string;
    },
  ): Promise<TenantProvisioningResult> {
    throw new Error(
      `Tenant provisioning is not supported in ${this.tenancyMode} tenancy mode`,
    );
  }

  getSchemas() {
    return {
      ...authSchema,
      ...logSchema,
      ...storageSchema,
      ...kvStoreSchema,
      ...workflowSchema,
    };
  }

  protected async pushSchemasTo(
    db: DrizzleDB,
    schemas: Record<string, unknown>,
  ): Promise<void> {
    const { pushSchema } = await import("drizzle-kit/api");

    function circularReplacer() {
      const seen = new WeakSet();
      return (_key: string, value: any) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      };
    }

    Bun.write(
      join(process.cwd(), "./schema.ts"),
      `export const schema = ${JSON.stringify(schemas, circularReplacer(), 2)};`,
    );

    const result = await pushSchema(schemas, db);
    if (result.statementsToExecute.length > 0) {
      console.log(`Applying ${result.statementsToExecute.length} Statements`);
      if (result.hasDataLoss) {
        console.warn("Schema push has data loss warnings:", result.warnings);
      }
      await result.apply();
      console.log("Schema Applied");
    }
  }

  private createDbWrapper(): DrizzleDB {
    const self = this;
    return new Proxy({} as DrizzleDB, {
      get(_target, prop) {
        const ctx = context.getStore();
        const realDb = ctx?.db ?? self.controlPlaneDbInstance;
        const value = Reflect.get(realDb, prop);
        if (typeof value === "function") {
          return value.bind(realDb);
        }
        return value;
      },
    });
  }
}
