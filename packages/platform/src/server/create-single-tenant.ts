import {
  BasePlatform as Base,
  type CommonConfig,
  type ExtractModuleNames,
  type MergedSchemas,
} from "./base-platform";
import { type DatabaseConfig, DatabaseUnit } from "./db";
import type { ArrayModuleAccessors, Module, PlatformUnits, UnitAccessors } from "./index";

export type SingleTenantConfig = CommonConfig & {
  db: DatabaseConfig;
};

export type SingleTenantPlatformInstance<
  M extends Module[],
  S extends Record<string, unknown> = MergedSchemas<M>,
> = SingleTenantPlatform<M, S> &
  UnitAccessors<S> &
  ArrayModuleAccessors<M, ExtractModuleNames<M>[number]>;

export class SingleTenantPlatform<
  M extends Module[],
  S extends Record<string, unknown> = MergedSchemas<M>,
> extends Base<M, S> {
  constructor(units: PlatformUnits<S>, modules: M) {
    console.warn("Single Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
  }

  static create<M extends Module[]>(
    config: SingleTenantConfig,
    modules: M,
  ): SingleTenantPlatformInstance<M> {
    const db = new DatabaseUnit<MergedSchemas<M>>(config.db, "single");
    const core = Base.createCore<M, MergedSchemas<M>>(db, config, modules);
    return new SingleTenantPlatform<M>(core.units, core.modules) as SingleTenantPlatformInstance<M>;
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.runInContext(fn);
  }
}
