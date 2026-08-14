import {
  BasePlatform as Base,
  type CommonConfig,
  type ExtractModuleNames,
  type MergedSchemas,
} from "./base-platform";
import { type DatabaseConfig, DatabaseUnit } from "./db";
import type { ArrayModuleAccessors, Module, PlatformUnits, UnitAccessors } from "./index";
import { isGlobalTenantId } from "./utils/is-global-tenant-id";

export type SharedTenantConfig = CommonConfig & {
  db: DatabaseConfig;
};

export type SharedTenantPlatformInstance<
  TModules extends Module[],
  TSchemas extends Record<string, unknown> = MergedSchemas<TModules>,
> = SharedTenantPlatform<TModules, TSchemas> &
  UnitAccessors<TSchemas> &
  ArrayModuleAccessors<TModules, ExtractModuleNames<TModules>[number]>;

export class SharedTenantPlatform<
  TModules extends Module[],
  TSchemas extends Record<string, unknown> = MergedSchemas<TModules>,
> extends Base<TModules, TSchemas> {
  private readonly dbUnit: DatabaseUnit<TSchemas>;

  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    console.warn("Shared Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
    this.dbUnit = units.db as DatabaseUnit<TSchemas>;
  }

  static create<TModules extends Module[]>(
    config: SharedTenantConfig,
    modules: TModules,
  ): SharedTenantPlatformInstance<TModules> {
    const db = new DatabaseUnit<MergedSchemas<TModules>>(config.db, "shared");
    const core = Base.createCore<TModules, MergedSchemas<TModules>>(db, config, modules);
    return new SharedTenantPlatform<TModules>(
      core.units,
      core.modules,
    ) as SharedTenantPlatformInstance<TModules>;
  }

  override async $prepareInfra(): Promise<void> {
    await super.$prepareInfra();

    try {
      await this.dbUnit.applyRlsPolicies(this.units.db.controlPlaneDb);
    } catch (err) {
      console.error("Failed to apply RLS policies", err);
    }
  }

  async run<TValue>(tenantId: string, fn: () => TValue | Promise<TValue>): Promise<TValue> {
    if (isGlobalTenantId(tenantId)) {
      return this.runInContext(fn, { tenantId });
    }
    return this.dbUnit.runWithTenant(tenantId, (db) => this.runInContext(fn, { db, tenantId }));
  }
}
