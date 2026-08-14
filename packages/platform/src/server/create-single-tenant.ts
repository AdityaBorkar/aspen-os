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
  TModules extends Module[],
  TSchemas extends Record<string, unknown> = MergedSchemas<TModules>,
> = SingleTenantPlatform<TModules, TSchemas> &
  UnitAccessors<TSchemas> &
  ArrayModuleAccessors<TModules, ExtractModuleNames<TModules>[number]>;

export class SingleTenantPlatform<
  TModules extends Module[],
  TSchemas extends Record<string, unknown> = MergedSchemas<TModules>,
> extends Base<TModules, TSchemas> {
  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    console.warn("Single Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
  }

  static create<TModules extends Module[]>(
    config: SingleTenantConfig,
    modules: TModules,
  ): SingleTenantPlatformInstance<TModules> {
    const db = new DatabaseUnit<MergedSchemas<TModules>>(config.db, "single");
    const core = Base.createCore<TModules, MergedSchemas<TModules>>(db, config, modules);
    return new SingleTenantPlatform<TModules>(
      core.units,
      core.modules,
    ) as SingleTenantPlatformInstance<TModules>;
  }

  async run<TValue>(fn: () => TValue | Promise<TValue>): Promise<TValue> {
    return this.runInContext(fn);
  }
}
