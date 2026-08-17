import { BasePlatform as Base } from "#/server/base-platform";
import type { CommonConfig, ExtractModuleNames, MergedSchemas } from "#/server/base-platform";
import { DatabaseUnit } from "#/server/db";
import type { DatabaseConfig } from "#/server/db";
import type {
  Module,
  ArrayModuleAccessors,
  PlatformUnits,
  UnitAccessors,
  SchemaMap,
} from "#/server/types";

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
  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    console.warn("Shared Tenant Architecture is currently EXPERIMENTAL");
    super(units, modules);
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
}
