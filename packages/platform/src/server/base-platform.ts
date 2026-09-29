import { AuditUnit } from "#/server/audit";
import { AuthUnit } from "#/server/auth";
import type { AuthConfig } from "#/server/auth";
import { DatabaseUnit } from "#/server/db";
import type { IsolatedTenantDatabaseConfig } from "#/server/db";
import { KvStoreUnit } from "#/server/kv-store";
import type { KvStoreConfig } from "#/server/kv-store";
import { LogUnit } from "#/server/log";
import type { LogConfig } from "#/server/log";
import { PubSubUnit } from "#/server/pubsub";
import type { PubSubConfig } from "#/server/pubsub";
import { RpcUnit } from "#/server/rpc";
import type { RpcConfig } from "#/server/rpc";
import { StorageUnit } from "#/server/storage";
import type { StorageConfig } from "#/server/storage";
import type {
  Module,
  ArrayModuleAccessors,
  PlatformUnits,
  UnitAccessors,
  SchemaMap,
} from "#/server/types";
import { context, isGlobalTenantId } from "#/server/utils";
import type { Context } from "#/server/utils";

export type ExtractModuleNames<TModules extends Module[]> = {
  [TKey in keyof TModules]: TModules[TKey] extends { $name: infer TName extends string }
    ? TName
    : never;
};

export type ModuleByName<
  TModules extends Module[],
  TKey extends TModules[number]["$name"],
> = Extract<TModules[number], { $name: TKey }>;

type UnionToIntersection<TValue> = (
  TValue extends unknown ? (value: TValue) => void : never
) extends (value: infer TResult) => void
  ? TResult
  : never;

export type InferControlPlaneSchemas<TModules extends Module[]> = UnionToIntersection<
  TModules[number] extends Module<infer _N, infer TCP, infer _TT> ? TCP : never
>;

export type InferTenantSchemas<TModules extends Module[]> = UnionToIntersection<
  TModules[number] extends Module<infer _N, infer _TCP, infer TT> ? TT : never
>;

export type MergedSchemas<TModules extends Module[]> = InferControlPlaneSchemas<TModules> &
  InferTenantSchemas<TModules> &
  Record<string, never>;

/** Units + modules assembled by {@link IsolatedTenantPlatform.create}. */
export interface CoreUnits<TModules extends Module[], TSchemas extends SchemaMap> {
  modules: TModules;
  units: PlatformUnits<TSchemas>;
}

export interface CommonConfig {
  auth: AuthConfig;
  kvStore: KvStoreConfig;
  logs: LogConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
}

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
> implements UnitAccessors<TSchemas> {
  declare readonly audit: PlatformUnits<TSchemas>["audit"];
  declare readonly auth: PlatformUnits<TSchemas>["auth"];
  declare readonly db: PlatformUnits<TSchemas>["db"];
  declare readonly kvStore: PlatformUnits<TSchemas>["kvStore"];
  declare readonly logs: PlatformUnits<TSchemas>["logs"];
  declare readonly pubsub: PlatformUnits<TSchemas>["pubsub"];
  declare readonly rpc: PlatformUnits<TSchemas>["rpc"];
  declare readonly storage: PlatformUnits<TSchemas>["storage"];

  protected readonly modules: TModules;
  protected readonly units: PlatformUnits<TSchemas>;
  private readonly dbUnit: DatabaseUnit<TSchemas>;

  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    this.units = units;
    this.modules = modules;
    this.dbUnit = units.db;
    return new Proxy(this, {
      get(target, prop, _receiver) {
        if (prop in target.units) {
          // SAFETY: proxy access for a unit name resolves to the matching unit.
          return target.units[prop as keyof PlatformUnits<TSchemas>];
        }
        const mod = target.modules.find((module) => module.$name === prop);
        if (mod) {
          return mod;
        }
        // SAFETY: fall through to the wrapped platform instance's own members.
        return target[prop as keyof typeof target];
      },
    });
  }

  static create<TModules extends Module[]>(
    config: IsolatedTenantConfig,
    modules: TModules,
  ): IsolatedTenantPlatformInstance<TModules> {
    const { tenantDbPrefix } = config.db;
    const db = new DatabaseUnit<MergedSchemas<TModules>>({
      controlPlaneDbName: config.db.controlPlaneDbName,
      database: config.db.controlDbName,
      host: config.db.connection.host,
      maxConnections: config.db.pool?.maxConnections,
      password: config.db.connection.password,
      port: config.db.connection.port,
      resolver: {
        // Default resolver mirrors `DatabaseUnit.resolveDatabaseName` so
        // `resolveDatabase`, `provisionTenant`, and `getTenantDb` agree.
        // (The exact `${prefix}_${tenantId}` concatenation is preserved
        // for backward compatibility with already-provisioned databases;
        // configure the prefix without a trailing underscore for new deployments.)
        // SAFETY: empty list is the complete tenant set until a real resolver is configured.
        list: async () => [] as string[],
        resolve: async (tenantId: string) =>
          tenantDbPrefix ? `${tenantDbPrefix}_${tenantId}` : tenantId,
      },
      ssl: config.db.connection.ssl,
      tenantDbDefaults: config.db.tenantDbDefaults,
      tenantDbPrefix: config.db.tenantDbPrefix,
      user: config.db.connection.user,
    });
    const core = IsolatedTenantPlatform.createCore<TModules, MergedSchemas<TModules>>(
      db,
      config,
      modules,
    );
    // Aggregate module schemas eagerly so `provisionTenant` pushes complete
    // tenant databases in any process — not only ones that ran $prepareInfra.
    // (Previously tenants onboarded from the dev server/seed got platform
    // tables only, silently missing all domain tables.)
    const storedControl: SchemaMap = {};
    const storedTenant: SchemaMap = {};
    for (const mod of modules) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(storedControl, infra.db.control_plane_schemas);
        Object.assign(storedTenant, infra.db.tenant_schemas);
      }
    }
    db.setStoredSchemas(storedControl, storedTenant);
    // SAFETY: create() returned an instance whose units/modules match the merged schema type.
    return new IsolatedTenantPlatform<TModules>(
      core.units,
      core.modules,
    ) as IsolatedTenantPlatformInstance<TModules>;
  }

  protected static createCore<TModules extends Module[], TSchemas extends SchemaMap>(
    db: DatabaseUnit<TSchemas>,
    config: CommonConfig,
    modules: TModules,
  ): CoreUnits<TModules, TSchemas> {
    const logs = new LogUnit(config.logs, { db });
    const audit = new AuditUnit({ db });
    const pubsub = new PubSubUnit(config.pubsub, { audit, db, log: logs });
    const auth = new AuthUnit(config.auth, { db, pubsub });
    pubsub.setAuth(auth);
    const storage = new StorageUnit(config.storage, { db });
    const kvStore = new KvStoreUnit(config.kvStore, { db });
    const rpc = new RpcUnit({ auth, db, logs, pubsub }, config.rpc);

    const units = { audit, auth, db, kvStore, logs, pubsub, rpc, storage };

    const moduleNames = new Set(modules.map((module) => module.$name));
    for (const mod of modules) {
      for (const dep of mod.$dependencies) {
        if (!moduleNames.has(dep)) {
          throw new Error(`Module "${mod.$name}" depends on "${dep}", but it was not provided`);
        }
      }
      mod.$initialize?.(units);
    }

    return { modules, units };
  }

  async $prepareInfra(): Promise<void> {
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

    // Preparing Units — failures are fatal so callers never see a false success.
    try {
      await this.units.db.$prepareInfra(controlSchemas, tenantSchemas);
    } catch (error) {
      throw new Error(
        `Failed to prepare unit "${this.units.db.$name}": ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    try {
      await this.units.auth.$prepareInfra(acl);
    } catch (error) {
      throw new Error(
        `Failed to prepare unit "${this.units.auth.$name}": ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    // oxlint-disable eslint/no-await-in-loop
    for (const unit of Object.values(this.units)) {
      if (unit.$name === "db" || unit.$name === "auth") {
        continue;
      }
      try {
        await unit.$prepareInfra?.();
      } catch (error) {
        throw new Error(
          `Failed to prepare unit "${unit.$name}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
    // oxlint-enable eslint/no-await-in-loop

    // Preparing Runtime Modules
    // oxlint-disable eslint/no-await-in-loop
    for (const mod of this.modules) {
      try {
        await this.run("$global", () => mod.$prepareRuntime?.());
      } catch (error) {
        throw new Error(
          `Failed to prepare module "${mod.$name}": ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
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

  async $cleanup(): Promise<void> {
    const moduleResults = await Promise.allSettled(
      this.modules.map((module) => this.run("$global", () => module.$cleanup())),
    );
    const unitResults = await Promise.allSettled(
      Object.values(this.units).map((unit) => unit.$cleanup()),
    );
    const failures = [...moduleResults, ...unitResults].flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    if (failures.length > 0) {
      throw new AggregateError(failures, `Failed to clean up ${failures.length} unit(s)/module(s)`);
    }
  }

  getModule<TKey extends TModules[number]["$name"]>(name: TKey): ModuleByName<TModules, TKey> {
    const mod = this.modules.find(
      (module): module is ModuleByName<TModules, TKey> => module.$name === name,
    );
    if (!mod) {
      throw new Error(`Module "${name}" not found`);
    }
    return mod;
  }

  getUnit<TKey extends keyof PlatformUnits<TSchemas>>(name: TKey): PlatformUnits<TSchemas>[TKey] {
    return this.units[name];
  }

  async run<TValue>(tenantId: string, fn: () => TValue | Promise<TValue>): Promise<TValue> {
    const parent = context.getStore();
    const ctx: Context = {
      actorId: parent?.actorId,
      audit: this.units.audit,
      auth: this.units.auth,
      // SAFETY: the Context db surface is schema-agnostic; the platform's merged-schema
      // drizzle instances share the same runtime query/select surface, so this cast only
      // narrows/loosens the static schema type without changing behaviour.
      db: (isGlobalTenantId(tenantId)
        ? this.units.db.controlPlaneDb
        : await this.units.db.getTenantDb(tenantId)) as Context["db"],
      log: this.units.logs,
      pubsub: this.units.pubsub,
      requestId: parent?.requestId,
      tenantId,
      traceId: parent?.traceId,
    };
    return context.run(ctx, fn);
  }
}
