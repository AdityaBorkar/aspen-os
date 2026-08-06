import {
  BasePlatform as Base,
  type CommonConfig,
  type ExtractModuleNames,
  type MergedSchemas,
} from "./base-platform";
import {
  type DatabaseConfig,
  DatabaseUnit,
  type IsolatedTenantDatabaseConfig,
} from "./db";
import type {
  ArrayModuleAccessors,
  Module,
  PlatformUnits,
  UnitAccessors,
} from "./index";
import { isGlobalTenantId } from "./utils/is-global-tenant-id";

export type IsolatedTenantConfig = CommonConfig & {
  db: IsolatedTenantDatabaseConfig;
};

export type IsolatedTenantPlatformInstance<
  M extends Module[],
  S extends Record<string, unknown> = MergedSchemas<M>,
> = IsolatedTenantPlatform<M, S> &
  UnitAccessors<S> &
  ArrayModuleAccessors<M, ExtractModuleNames<M>[number]>;

export class IsolatedTenantPlatform<
  M extends Module[],
  S extends Record<string, unknown> = MergedSchemas<M>,
> extends Base<M, S> {
  private readonly dbUnit: DatabaseUnit<S>;

  constructor(units: PlatformUnits<S>, modules: M) {
    super(units, modules);
    this.dbUnit = units.db as DatabaseUnit<S>;
  }

  static create<M extends Module[]>(
    config: IsolatedTenantConfig,
    modules: M,
  ): IsolatedTenantPlatformInstance<M> {
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
    const db = new DatabaseUnit<MergedSchemas<M>>(dbConfig, "isolated", {
      controlPlaneDbName: config.db.controlPlaneDbName,
      resolver,
      tenantDbDefaults: config.db.tenantDbDefaults,
      tenantDbPrefix: config.db.tenantDbPrefix,
    });
    const core = Base.createCore<M, MergedSchemas<M>>(db, config, modules);
    return new IsolatedTenantPlatform<M>(
      core.units,
      core.modules,
    ) as IsolatedTenantPlatformInstance<M>;
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
    const prepareUnits: Array<() => Promise<void>> = [
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
      await prepare().catch((err) => {
        console.error(`Failed to prepare unit`, err);
      });
    }

    // Preparing Runtime Modules
    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$prepareRuntime?.());
      } catch (err) {
        console.error(`Failed to prepare module "${mod.$name}"`, err);
      }
    }

    // Preparing Tenant Modules
    const tenantIds = (await this.dbUnit.resolver?.list()) || [];
    for (const tenantId of tenantIds) {
      await this.run(tenantId, async () => {
        for await (const mod of this.modules) {
          await mod.$prepareTenant?.(tenantId).catch((err) => {
            console.error(
              `Failed to prepare tenant "${tenantId}" for module "${mod.$name}"`,
              err,
            );
          });
        }
      });
    }
  }

  async run<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T> {
    const db = isGlobalTenantId(tenantId)
      ? this.dbUnit.controlPlaneDb
      : await this.dbUnit.getTenantDb(tenantId);
    return this.runInContext(fn, { db, tenantId }) as T;
  }
}
