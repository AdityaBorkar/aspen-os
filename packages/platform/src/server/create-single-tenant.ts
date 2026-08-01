import {
  BasePlatform as Base,
  type CommonConfig,
  type ExtractModuleNames,
} from "./base-platform";
import { type DatabaseConfig, DatabaseUnit } from "./db";
import type {
  ArrayModuleAccessors,
  Module,
  PlatformUnits,
  UnitAccessors,
} from "./index";

export type SingleTenantConfig = CommonConfig & {
  db: DatabaseConfig;
};

export type SingleTenantPlatformInstance<M extends Module[]> =
  SingleTenantPlatform<M> &
    UnitAccessors &
    ArrayModuleAccessors<ExtractModuleNames<M>[number]>;

export class SingleTenantPlatform<M extends Module[]> extends Base<M> {
  constructor(units: PlatformUnits, modules: M) {
    console.warn("Single Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
  }

  static create<M extends Module[]>(
    config: SingleTenantConfig,
    modules: M,
  ): SingleTenantPlatformInstance<M> {
    const db = new DatabaseUnit(config.db, "single");
    const core = Base.createCore(db, config, modules);
    return new SingleTenantPlatform<M>(
      core.units,
      core.modules,
    ) as unknown as SingleTenantPlatformInstance<M>;
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.runInContext(fn);
  }
}
