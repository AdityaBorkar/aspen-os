import { BasePlatform as Base } from "#/server/base-platform";
import type { CommonConfig, ExtractModuleNames, MergedSchemas } from "#/server/base-platform";
import { DatabaseUnit } from "#/server/db";
import type { IsolatedTenantDatabaseConfig } from "#/server/db";
import type {
  Module,
  ArrayModuleAccessors,
  PlatformUnits,
  UnitAccessors,
  SchemaMap,
} from "#/server/types";

export type IsolatedTenantConfig = CommonConfig & {
  db: IsolatedTenantDatabaseConfig;
};

export type IsolatedTenantPlatformInstance<
  TModules extends Module[],
  TSchemas extends SchemaMap = MergedSchemas<TModules>,
> = IsolatedTenantPlatform<TModules, TSchemas> &
  UnitAccessors<TSchemas> &
  ArrayModuleAccessors<TModules, ExtractModuleNames<TModules>[number]>;

export class IsolatedTenantPlatform<
  TModules extends Module[],
  TSchemas extends SchemaMap = MergedSchemas<TModules>,
> extends Base<TModules, TSchemas> {
  private readonly dbUnit: DatabaseUnit<TSchemas>;

  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    super(units, modules);
    this.dbUnit = units.db;
  }

  static create<TModules extends Module[]>(
    config: IsolatedTenantConfig,
    modules: TModules,
  ): IsolatedTenantPlatformInstance<TModules> {
    const db = new DatabaseUnit<MergedSchemas<TModules>>(
      {
        controlPlaneDbName: config.db.controlPlaneDbName,
        database: config.db.controlDbName,
        host: config.db.connection.host,
        maxConnections: config.db.pool?.maxConnections,
        password: config.db.connection.password,
        port: config.db.connection.port,
        resolver: {
          // SAFETY: the inline resolver is a placeholder; provisionTenant routes global tenant IDs to the control plane.
          list: async () => [] as string[],
          resolve: async (tenantId: string) => tenantId,
        },
        ssl: config.db.connection.ssl,
        tenantDbDefaults: config.db.tenantDbDefaults,
        tenantDbPrefix: config.db.tenantDbPrefix,
        user: config.db.connection.user,
      },
      "isolated",
    );
    const core = Base.createCore<TModules, MergedSchemas<TModules>>(db, config, modules);
    // SAFETY: create() returned an instance whose units/modules match the merged schema type.
    return new IsolatedTenantPlatform<TModules>(
      core.units,
      core.modules,
    ) as IsolatedTenantPlatformInstance<TModules>;
  }

  override async $prepareInfra(): Promise<void> {
    // Commons
    const controlSchemas: SchemaMap = {};
    const tenantSchemas: SchemaMap = {};
    const acl: Record<string, string[]> = {};

    // Preparing Modules
    for (const mod of this.modules) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(controlSchemas, infra.db.control_plane_schemas);
        Object.assign(tenantSchemas, infra.db.tenant_schemas);
        for (const [resource, actions] of Object.entries(infra.auth.acl)) {
          if (!acl[resource]) {
            acl[resource] = [];
          }
          acl[resource] = [...acl[resource], ...actions];
        }
      }
    }

    // Preparing Units
    try {
      await this.units.db.$prepareInfra(controlSchemas, tenantSchemas);
    } catch (error) {
      console.error(`Failed to prepare unit "${this.units.db.$name}"`, error);
    }
    try {
      await this.units.auth.$prepareInfra(acl);
    } catch (error) {
      console.error(`Failed to prepare unit "${this.units.auth.$name}"`, error);
    }
    // oxlint-disable eslint/no-await-in-loop
    for (const unit of Object.values(this.units)) {
      if (unit.$name === "db" || unit.$name === "auth") {
        continue;
      }
      try {
        await unit.$prepareInfra?.();
      } catch (error) {
        console.error(`Failed to prepare unit "${unit.$name}"`, error);
      }
    }
    // oxlint-enable eslint/no-await-in-loop

    // Preparing Runtime Modules
    // oxlint-disable eslint/no-await-in-loop
    for (const mod of this.modules) {
      try {
        await this.run("$global", () => mod.$prepareRuntime?.());
      } catch (error) {
        console.error(`Failed to prepare module "${mod.$name}"`, error);
      }
    }
    // oxlint-enable eslint/no-await-in-loop

    // Preparing Tenant Modules
    const tenantIds = (await this.dbUnit.resolver?.list()) || [];
    // oxlint-disable eslint/no-await-in-loop
    for (const tenantId of tenantIds) {
      await this.run(tenantId, async () => {
        for (const mod of this.modules) {
          await mod.$prepareTenant?.(tenantId).catch((error) => {
            console.error(
              `Failed to prepare tenant "${tenantId}" for module "${mod.$name}"`,
              error,
            );
          });
        }
      });
    }
    // oxlint-enable eslint/no-await-in-loop
  }
}
