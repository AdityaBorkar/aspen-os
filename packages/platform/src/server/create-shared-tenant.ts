import type { ArrayModuleAccessors, Module, PlatformUnits, UnitAccessors } from "#/server";
import { BasePlatform as Base } from "#/server/base-platform";
import type { CommonConfig, ExtractModuleNames, MergedSchemas } from "#/server/base-platform";
import { DatabaseUnit } from "#/server/db";
import type { DatabaseConfig } from "#/server/db";
import type { SchemaMap } from "#/server/types";
import { isGlobalTenantId } from "#/server/utils/is-global-tenant-id";

export type SharedTenantConfig = CommonConfig & {
  db: DatabaseConfig;
};

export type SharedTenantPlatformInstance<
  TModules extends Module[],
  TSchemas extends SchemaMap = MergedSchemas<TModules>,
> = SharedTenantPlatform<TModules, TSchemas> &
  UnitAccessors<TSchemas> &
  ArrayModuleAccessors<TModules, ExtractModuleNames<TModules>[number]>;

export class SharedTenantPlatform<
  TModules extends Module[],
  TSchemas extends SchemaMap = MergedSchemas<TModules>,
> extends Base<TModules, TSchemas> {
  private readonly dbUnit: DatabaseUnit<TSchemas>;

  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    console.warn("Shared Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
    this.dbUnit = units.db;
  }

  static create<TModules extends Module[]>(
    config: SharedTenantConfig,
    modules: TModules,
  ): SharedTenantPlatformInstance<TModules> {
    const db = new DatabaseUnit<MergedSchemas<TModules>>(config.db, "shared");
    const core = Base.createCore<TModules, MergedSchemas<TModules>>(db, config, modules);
    // SAFETY: create() returned an instance whose units/modules match the merged schema type.
    return new SharedTenantPlatform<TModules>(
      core.units,
      core.modules,
    ) as SharedTenantPlatformInstance<TModules>;
  }

  override async $prepareInfra(): Promise<void> {
    await super.$prepareInfra();

    try {
      await this.dbUnit.applyRlsPolicies(this.units.db.controlPlaneDb);
    } catch (error) {
      console.error("Failed to apply RLS policies", error);
    }
  }

  async run<TValue>(tenantId: string, fn: () => TValue | Promise<TValue>): Promise<TValue> {
    if (isGlobalTenantId(tenantId)) {
      return this.runInContext(fn, { tenantId });
    }
    return this.dbUnit.runWithTenant(tenantId, (db) => this.runInContext(fn, { db, tenantId }));
  }
}
