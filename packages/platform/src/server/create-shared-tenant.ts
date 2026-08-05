import {
  BasePlatform as Base,
  type CommonConfig,
  type ExtractModuleNames,
  type MergedSchemas,
} from "./base-platform";
import { type DatabaseConfig, DatabaseUnit } from "./db";
import type {
  ArrayModuleAccessors,
  Module,
  PlatformUnits,
  UnitAccessors,
} from "./index";
import { isGlobalTenantId } from "./utils/is-global-tenant-id";

export type SharedTenantConfig = CommonConfig & {
  db: DatabaseConfig;
};

export type SharedTenantPlatformInstance<
  M extends Module[],
  S extends Record<string, unknown> = MergedSchemas<M>,
> = SharedTenantPlatform<M, S> &
  UnitAccessors<S> &
  ArrayModuleAccessors<M, ExtractModuleNames<M>[number]>;

export class SharedTenantPlatform<
  M extends Module[],
  S extends Record<string, unknown> = MergedSchemas<M>,
> extends Base<M, S> {
  private readonly dbUnit: DatabaseUnit<S>;

  constructor(units: PlatformUnits<S>, modules: M) {
    console.warn("Shared Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
    this.dbUnit = units.db as DatabaseUnit<S>;
  }

  static create<M extends Module[]>(
    config: SharedTenantConfig,
    modules: M,
  ): SharedTenantPlatformInstance<M> {
    const db = new DatabaseUnit<MergedSchemas<M>>(config.db, "shared");
    const core = Base.createCore<M, MergedSchemas<M>>(db, config, modules);
    return new SharedTenantPlatform<M>(
      core.units,
      core.modules,
    ) as SharedTenantPlatformInstance<M>;
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
    if (isGlobalTenantId(tenantId)) {
      return this.runInContext(fn, { tenantId });
    }
    return this.dbUnit.runWithTenant(tenantId, (db) =>
      this.runInContext(fn, { db, tenantId }),
    );
  }
}
