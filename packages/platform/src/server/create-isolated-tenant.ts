import type { ArrayModuleAccessors, Module, PlatformUnits, UnitAccessors } from "#/server";
import { BasePlatform as Base } from "#/server/base-platform";
import type { CommonConfig, ExtractModuleNames, MergedSchemas } from "#/server/base-platform";
import { DatabaseUnit } from "#/server/db";
import type { DatabaseConfig, IsolatedTenantDatabaseConfig } from "#/server/db";
import { isGlobalTenantId } from "#/server/utils/is-global-tenant-id";

export type IsolatedTenantConfig = CommonConfig & {
  db: IsolatedTenantDatabaseConfig;
};

export type IsolatedTenantPlatformInstance<
  TModules extends Module[],
  TSchemas extends Record<string, unknown> = MergedSchemas<TModules>,
> = IsolatedTenantPlatform<TModules, TSchemas> &
  UnitAccessors<TSchemas> &
  ArrayModuleAccessors<TModules, ExtractModuleNames<TModules>[number]>;

export class IsolatedTenantPlatform<
  TModules extends Module[],
  TSchemas extends Record<string, unknown> = MergedSchemas<TModules>,
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
    const dbConfig: DatabaseConfig = {
      database: config.db.controlDbName,
      host: config.db.connection.host,
      maxConnections: config.db.pool?.maxConnections,
      password: config.db.connection.password,
      port: config.db.connection.port,
      ssl: config.db.connection.ssl,
      user: config.db.connection.user,
    };
    const resolver = {
      list: async () => [] as string[],
      resolve: async (tenantId: string) => tenantId,
    };
    const db = new DatabaseUnit<MergedSchemas<TModules>>(dbConfig, "isolated", {
      controlPlaneDbName: config.db.controlPlaneDbName,
      resolver,
      tenantDbDefaults: config.db.tenantDbDefaults,
      tenantDbPrefix: config.db.tenantDbPrefix,
    });
    const core = Base.createCore<TModules, MergedSchemas<TModules>>(db, config, modules);
    return new IsolatedTenantPlatform<TModules>(
      core.units,
      core.modules,
    ) as IsolatedTenantPlatformInstance<TModules>;
  }

  override async $prepareInfra(): Promise<void> {
    // Commons
    const controlSchemas: Record<string, unknown> = {};
    const tenantSchemas: Record<string, unknown> = {};
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
          acl[resource].push(...(actions as string[]));
        }
      }
    }

    // Preparing Unit Methods
    const prepareUnits: (() => Promise<void>)[] = [
      () => this.units.db.$prepareInfra(controlSchemas, tenantSchemas),
      () => this.units.auth.$prepareInfra(acl),
    ];
    for (const unit of Object.values(this.units)) {
      if (unit.$name !== "db" && unit.$name !== "auth") {
        prepareUnits.push(() => unit.$prepareInfra?.());
      }
    }

    // Preparing Units
    for await (const prepare of prepareUnits) {
      await prepare().catch((error) => {
        console.error(`Failed to prepare unit`, error);
      });
    }

    // Preparing Runtime Modules
    // oxlint-disable eslint/no-await-in-loop
    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$prepareRuntime?.());
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
        for await (const mod of this.modules) {
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

  async run<TValue>(tenantId: string, fn: () => TValue | Promise<TValue>): Promise<TValue> {
    const db = isGlobalTenantId(tenantId)
      ? this.dbUnit.controlPlaneDb
      : await this.dbUnit.getTenantDb(tenantId);
    return this.runInContext(fn, { db, tenantId });
  }
}
