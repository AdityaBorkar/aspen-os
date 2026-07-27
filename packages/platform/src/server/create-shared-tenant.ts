import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";

import {
  BasePlatform as Base,
  type CommonConfig,
  type ExtractModuleNames,
} from "./base-platform";
import type { DatabaseConfig } from "./db";
import { SharedTenantDatabaseUnit } from "./db";
import type {
  ArrayModuleAccessors,
  Module,
  PlatformUnits,
  UnitAccessors,
} from "./index";

export type SharedTenantConfig = CommonConfig & {
  db: DatabaseConfig;
};

export type SharedTenantPlatformInstance<M extends Module[]> =
  SharedTenantPlatform<M> &
    UnitAccessors &
    ArrayModuleAccessors<ExtractModuleNames<M>[number]>;

export class SharedTenantPlatform<M extends Module[]> extends Base<M> {
  private readonly dbUnit: SharedTenantDatabaseUnit;

  constructor(units: PlatformUnits, modules: M) {
    console.warn("Shared Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
    this.dbUnit = units.db as SharedTenantDatabaseUnit;
  }

  static create<M extends Module[]>(
    config: SharedTenantConfig,
    modules: M,
  ): SharedTenantPlatformInstance<M> {
    const db = new SharedTenantDatabaseUnit(config.db);
    const core = Base.createCore(db, config, modules);
    return new SharedTenantPlatform<M>(
      core.units,
      core.modules,
    ) as unknown as SharedTenantPlatformInstance<M>;
  }

  override async $prepareInfra(): Promise<void> {
    await super.$prepareInfra();

    try {
      await this.dbUnit.applyRlsPolicies(this.units.db.controlPlaneDb);
    } catch (err) {
      console.error("Failed to apply RLS policies", err);
    }
  }

  async run<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T> {
    const client = await this.units.db.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [
        tenantId,
      ]);
      await client.query("SET LOCAL ROLE tenant_role");
      const db = drizzle(client);
      const result = await this.runInContext(fn, { db });
      await client.query("COMMIT");
      return result as T;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  protected override runInContext<T>(
    fn: () => T | Promise<T>,
    overrides?: { db?: NodePgDatabase<Record<string, never>> },
  ): T | Promise<T> {
    return super.runInContext(fn, overrides);
  }
}
