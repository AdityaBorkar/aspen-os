import {
  BasePlatform as Base,
  type CommonConfig,
  type ExtractModuleNames,
} from "./base-platform";
import { isGlobalTenantId } from "./constants";
import { type DatabaseConfig, DatabaseUnit } from "./db";
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
  private readonly dbUnit: DatabaseUnit;

  constructor(units: PlatformUnits, modules: M) {
    console.warn("Shared Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
    this.dbUnit = units.db as DatabaseUnit;
  }

  static create<M extends Module[]>(
    config: SharedTenantConfig,
    modules: M,
  ): SharedTenantPlatformInstance<M> {
    const db = new DatabaseUnit(config.db, "shared");
    const core = Base.createCore(db, config, modules);
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
