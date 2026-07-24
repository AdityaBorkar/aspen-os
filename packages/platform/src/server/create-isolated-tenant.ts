import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { type AuthConfig, AuthUnit } from "./auth";
import { context } from "./context";
import {
  type DatabaseConfig,
  DatabaseUnit,
  type IsolatedTenantDatabaseConfig,
} from "./db";
import type {
  ArrayModuleAccessors,
  Module,
  PlatformUnits,
  TenancyMode,
  UnitAccessors,
} from "./index";
import { type KvStoreConfig, KvStoreUnit } from "./kv-store";
import { type LogConfig, LogUnit } from "./log";
import { type PubSubConfig, PubSubUnit } from "./pubsub";
import { type RpcConfig, RpcUnit } from "./rpc";
import { type StorageConfig, StorageUnit } from "./storage";

export type IsolatedTenantConfig = {
  auth: AuthConfig;
  db: IsolatedTenantDatabaseConfig;
  kvStore: KvStoreConfig;
  logs: LogConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
};

type ExtractModuleNames<M extends Module[]> = {
  [K in keyof M]: M[K] extends { $name: infer N extends string } ? N : never;
};

export type IsolatedTenantPlatformInstance<M extends Module[]> =
  IsolatedTenantPlatform<M> &
    UnitAccessors &
    ArrayModuleAccessors<ExtractModuleNames<M>[number]>;

export class IsolatedTenantPlatform<M extends Module[]> {
  constructor(
    private readonly units: PlatformUnits,
    private readonly modules: M,
  ) {
    // biome-ignore lint/correctness/noConstructorReturn: Exception
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const unit = target.units[prop as keyof PlatformUnits];
          if (unit) return unit;
          const mod = target.modules.find((m) => m.$name === prop);
          if (mod) return mod;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
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
    const db = new DatabaseUnit(dbConfig, {
      adminDatabase: config.db.adminDatabase,
      mode: "isolated",
      resolver,
      tenantDbDefaults: config.db.tenantDbDefaults,
      tenantDbPrefix: config.db.tenantDbPrefix,
    });
    const logs = new LogUnit(config.logs, { db });
    const pubsub = new PubSubUnit(config.pubsub, { db });
    const auth = new AuthUnit(config.auth, { db });
    pubsub.setAuth(auth);
    auth.setPubSub(pubsub);
    const storage = new StorageUnit(config.storage, { db });
    const kvStore = new KvStoreUnit(config.kvStore, { db });
    const rpc = new RpcUnit(config.rpc, { auth, db, logs, pubsub });

    const units = { auth, db, kvStore, logs, pubsub, rpc, storage };

    const moduleNames = new Set(modules.map((m) => m.$name));
    for (const mod of modules) {
      for (const dep of mod.$dependencies) {
        if (!moduleNames.has(dep)) {
          throw new Error(
            `Module "${mod.$name}" depends on "${dep}", but it was not provided`,
          );
        }
      }
      mod.$initialize?.(units);
    }

    return new IsolatedTenantPlatform<M>(
      units,
      modules,
    ) as IsolatedTenantPlatformInstance<M>;
  }

  get tenancyMode(): TenancyMode {
    return this.units.db.tenancyMode;
  }

  async $cleanup(): Promise<void> {
    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$cleanup());
      } catch {
        console.error(`Failed to destroy module "${mod.$name}"`);
      }
    }
    for (const unit of Object.values(this.units)) {
      try {
        await unit.$cleanup();
      } catch {
        console.error(`Failed to destroy unit "${unit.$name}"`);
      }
    }
  }

  async $prepareInfra(): Promise<void> {
    for (const unit of Object.values(this.units)) {
      try {
        await unit.$prepareInfra?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.$name}"`, err);
      }
    }

    const mergedModuleSchemas: Record<string, unknown> = {};
    const mergedAcl: Record<string, string[]> = {};

    for (const mod of this.modules) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(mergedModuleSchemas, infra.db.schemas);
        for (const [resource, actions] of Object.entries(infra.auth.acl)) {
          if (!mergedAcl[resource]) {
            mergedAcl[resource] = [];
          }
          mergedAcl[resource].push(...(actions as string[]));
        }
      }
    }

    await this.units.db.prepareWithModules(mergedModuleSchemas);
    this.units.auth.applyModuleAcl(mergedAcl);

    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$prepareRuntime?.());
      } catch (err) {
        console.error(`Failed to prepare module "${mod.$name}"`, err);
      }
    }

    if (!this.units.db.resolver) return;
    try {
      const tenantIds = await this.units.db.resolver.list();
      for (const tenantId of tenantIds) {
        const tenantDb = await this.units.db.getTenantDb(tenantId);
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
    const db = await this.units.db.getTenantDb(tenantId);
    return this.runInContext(fn, { db, tenantId }) as T;
  }

  getModule<K extends M[number]["$name"]>(
    name: K,
  ): Extract<M[number], { $name: K }> {
    const mod = this.modules.find((m) => m.$name === name);
    if (!mod) throw new Error(`Module "${String(name)}" not found`);
    return mod as Extract<M[number], { $name: K }>;
  }

  getUnit<K extends keyof PlatformUnits>(name: K): PlatformUnits[K] {
    return this.units[name];
  }

  private runInContext<T>(
    fn: () => T | Promise<T>,
    overrides?: {
      db?: NodePgDatabase<Record<string, never>>;
      tenantId?: string;
    },
  ): T | Promise<T> {
    return context.run(
      {
        auth: this.units.auth,
        db: overrides?.db ?? this.units.db.controlPlaneDb,
        pubsub: this.units.pubsub,
        ...(overrides?.tenantId && { tenantId: overrides.tenantId }),
      },
      fn,
    );
  }
}
