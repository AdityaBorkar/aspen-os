import { join } from "node:path";

import {
  BasePlatform as Base,
  type CommonConfig,
  type ExtractModuleNames,
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

export type IsolatedTenantPlatformInstance<M extends Module[]> =
  IsolatedTenantPlatform<M> &
    UnitAccessors &
    ArrayModuleAccessors<ExtractModuleNames<M>[number]>;

export class IsolatedTenantPlatform<M extends Module[]> extends Base<M> {
  private readonly dbUnit: DatabaseUnit;

  constructor(units: PlatformUnits, modules: M) {
    super(units, modules);
    this.dbUnit = units.db as DatabaseUnit;
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
    const db = new DatabaseUnit(dbConfig, "isolated", {
      controlPlaneDbName: config.db.controlPlaneDbName,
      resolver,
      tenantDbDefaults: config.db.tenantDbDefaults,
      tenantDbPrefix: config.db.tenantDbPrefix,
    });
    const core = Base.createCore(db, config, modules);
    return new IsolatedTenantPlatform<M>(
      core.units,
      core.modules,
    ) as IsolatedTenantPlatformInstance<M>;
  }

  override async $prepareInfra(): Promise<void> {
    console.log("Preparing schema files...");

    for (const unit of Object.values(this.units)) {
      try {
        console.log("Processing Unit - ", unit.$name);
        await unit.$prepareInfra?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.$name}"`, err);
      }
    }

    const mergedControlPlaneSchemas: Record<string, unknown> = {};
    const mergedTenantSchemas: Record<string, unknown> = {};
    const mergedAcl: Record<string, string[]> = {};

    for (const mod of this.modules) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(
          mergedControlPlaneSchemas,
          infra.db.control_plane_schemas,
        );
        Object.assign(mergedTenantSchemas, infra.db.tenant_schemas);
        for (const [resource, actions] of Object.entries(infra.auth.acl)) {
          if (!mergedAcl[resource]) {
            mergedAcl[resource] = [];
          }
          mergedAcl[resource].push(...(actions as string[]));
        }
      }
    }

    console.log("Writing schema files...");

    Bun.write(
      join(process.cwd(), "./acl.ts"),
      `export const acl = ${JSON.stringify(mergedAcl)};`,
    );
    Bun.write(
      join(process.cwd(), "./control-plane-schemas.ts"),
      `export const controlPlaneSchemas = ${JSON.stringify(mergedControlPlaneSchemas)};`,
    );
    Bun.write(
      join(process.cwd(), "./tenant-schemas.ts"),
      `export const tenantSchemas = ${JSON.stringify(mergedTenantSchemas)};`,
    );

    await this.units.db.prepareWithModules(
      mergedControlPlaneSchemas,
      mergedTenantSchemas,
    );
    this.units.auth.applyModuleAcl(mergedAcl);

    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$prepareRuntime?.());
      } catch (err) {
        console.error(`Failed to prepare module "${mod.$name}"`, err);
      }
    }

    try {
      const tenantIds = (await this.dbUnit.resolver?.list()) || [];
      for (const tenantId of tenantIds) {
        if (isGlobalTenantId(tenantId)) continue;
        const tenantDb = await this.dbUnit.getTenantDb(tenantId);
        await this.runInContext(
          async () => {
            for (const mod of this.modules) {
              try {
                await mod.$prepareTenant?.(tenantId);
              } catch (err) {
                console.error(
                  `Failed to prepare tenant "${tenantId}" for module "${mod.$name}"`,
                  err,
                );
              }
            }
          },
          { db: tenantDb, tenantId },
        );
      }
    } catch (err) {
      console.error("Failed to prepare tenants", err);
    }
  }

  async run<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T> {
    const db = isGlobalTenantId(tenantId)
      ? this.dbUnit.controlPlaneDb
      : await this.dbUnit.getTenantDb(tenantId);
    console.log({ db });
    return this.runInContext(fn, { db, tenantId }) as T;
  }
}
