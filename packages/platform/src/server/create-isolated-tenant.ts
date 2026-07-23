import { type AuthConfig, AuthUnit } from "./auth";
import { context } from "./context";
import {
  type DatabaseConfig,
  DatabaseUnit,
  type IsolatedTenantDatabaseConfig,
} from "./db";
import type {
  Module,
  ModuleAccessors,
  PlatformUnits,
  TenancyMode,
  // TenantResolver,
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
  // resolver: TenantResolver;
};

export type IsolatedTenantPlatformInstance<M extends Record<string, Module>> =
  IsolatedTenantPlatform<M> & UnitAccessors & ModuleAccessors<M>;

export class IsolatedTenantPlatform<M extends Record<string, Module>> {
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
        }
        if (typeof prop === "string") {
          const mod = target.modules[prop as keyof M];
          if (mod) return mod;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  static create<M extends Record<string, Module>>(
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
      list: async () => [""],
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

    const units: PlatformUnits = {
      auth,
      db,
      kvStore,
      logs,
      pubsub,
      rpc,
      storage,
    };

    const moduleNames = new Set(Object.values(modules).map((m) => m.$name));
    for (const mod of Object.values(modules)) {
      for (const dep of mod.$dependencies) {
        if (!moduleNames.has(dep)) {
          throw new Error(
            `Module "${mod.$name}" depends on "${dep}", but it was not provided`,
          );
        }
      }
    }

    const initializedModules = {} as Record<string, Module>;
    for (const mod of Object.values(modules)) {
      mod.$initialize?.(units);
      initializedModules[mod.$name] = mod;
    }

    return new IsolatedTenantPlatform<M>(
      units,
      initializedModules as M,
    ) as IsolatedTenantPlatformInstance<M>;
  }

  async destroy(): Promise<void> {
    for await (const mod of Object.values(this.modules)) {
      try {
        await context.run(
          {
            auth: this.units.auth,
            db: this.units.db.controlPlaneDb,
            pubsub: this.units.pubsub,
          },
          () => mod.$cleanup(),
        );
      } catch {
        console.error(`Failed to destroy module "${mod.$name}"`);
      }
    }
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$cleanup();
      } catch {
        console.error(`Failed to destroy unit "${unit.$name}"`);
      }
    }
  }

  get tenancyMode(): TenancyMode {
    return this.units.db.tenancyMode;
  }

  async prepareInfra(): Promise<void> {
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$prepareInfra?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.$name}"`, err);
      }
    }

    const mergedModuleSchemas: Record<string, unknown> = {};
    const mergedAcl: Record<string, { allowedActions: string[] }> = {};

    for (const mod of Object.values(this.modules)) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(mergedModuleSchemas, infra.db.schemas);
        for (const [resource, config] of Object.entries(infra.auth.acl)) {
          if (!mergedAcl[resource]) {
            mergedAcl[resource] = { allowedActions: [] };
          }
          mergedAcl[resource].allowedActions.push(...config.allowedActions);
        }
      }
    }

    await this.units.db.prepareWithModules(mergedModuleSchemas);
    this.units.auth.applyModuleAcl(mergedAcl);

    for await (const mod of Object.values(this.modules)) {
      try {
        await context.run(
          {
            auth: this.units.auth,
            db: this.units.db.controlPlaneDb,
            pubsub: this.units.pubsub,
          },
          () => mod.$prepareRuntime?.(),
        );
      } catch (err) {
        console.error(`Failed to prepare module "${mod.$name}"`, err);
      }
    }

    if (!this.units.db.resolver) return;
    try {
      const tenantIds = await this.units.db.resolver.list();
      for (const tenantId of tenantIds) {
        await this.$prepareTenant(tenantId);
      }
    } catch (err) {
      console.error("Failed to prepare tenants", err);
    }
  }

  async run<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T> {
    const db = await this.units.db.getTenantDb(tenantId);
    return context.run(
      {
        auth: this.units.auth,
        db,
        pubsub: this.units.pubsub,
        tenantId,
      },
      fn,
    ) as T;
  }

  getModule<K extends keyof M>(name: K): M[K] {
    const module = this.modules[name];
    if (!module) throw new Error(`Module "${String(name)}" not found`);
    return module;
  }

  getUnit<K extends keyof PlatformUnits>(name: K): PlatformUnits[K] {
    return this.units[name];
  }

  // private async createTenant(tenantId: string): Promise<void> {
  //   const db = await this.units.db.getTenantDb(tenantId);
  //   await context.run(
  //     {
  //       auth: this.units.auth,
  //       db,
  //       pubsub: this.units.pubsub,
  //       tenantId,
  //     },
  //     async () => {
  //       for (const mod of Object.values(this.modules)) {
  //         try {
  //           await mod.$prepareTenant?.(tenantId);
  //         } catch (err) {
  //           console.error(
  //             `Failed to prepare tenant "${tenantId}" for module "${mod.$name}"`,
  //             err,
  //           );
  //         }
  //       }
  //     },
  //   );
  // }

  private async $prepareTenant(tenantId: string): Promise<void> {
    const db = await this.units.db.getTenantDb(tenantId);
    await context.run(
      {
        auth: this.units.auth,
        db,
        pubsub: this.units.pubsub,
        tenantId,
      },
      async () => {
        for (const mod of Object.values(this.modules)) {
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
    );
  }
}
