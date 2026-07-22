import { type AuthConfig, AuthUnit } from "./auth";
import { context } from "./context";
import {
  type DatabaseConfig,
  DatabaseUnit,
  type IsolatedTenantDatabaseConfig,
} from "./db";
import type {
  FrameworkUnits,
  Module,
  ModuleAccessors,
  TenantResolver,
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
  resolver: TenantResolver;
};

export type IsolatedTenantPlatformInstance<M extends Record<string, Module>> =
  IsolatedTenantPlatform<M> & UnitAccessors & ModuleAccessors<M>;

export class IsolatedTenantPlatform<M extends Record<string, Module>> {
  constructor(
    private readonly units: FrameworkUnits,
    private readonly modules: M,
  ) {
    // biome-ignore lint/correctness/noConstructorReturn: Exception
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const unit = target.units[prop as keyof FrameworkUnits];
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
    const db = new DatabaseUnit(dbConfig, {
      mode: "isolated",
      resolver: config.resolver,
    });
    const logs = new LogUnit(config.logs, { db });
    const pubsub = new PubSubUnit(config.pubsub, { db });
    const auth = new AuthUnit(config.auth, { db });
    pubsub.setAuth(auth.auth);
    auth.setPubSub(pubsub);
    const storage = new StorageUnit(config.storage, { db });
    const kvStore = new KvStoreUnit(config.kvStore, { db });
    const rpc = new RpcUnit(config.rpc, { auth, db, logs, pubsub });

    const units: FrameworkUnits = {
      auth,
      db,
      kvStore,
      logs,
      pubsub,
      rpc,
      storage,
    };

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

  async $cleanup(): Promise<void> {
    for await (const mod of Object.values(this.modules)) {
      try {
        await mod.$destroy();
      } catch {
        console.error(`Failed to cleanup module "${mod.$name}"`);
      }
    }
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$destroy();
      } catch {
        console.error(`Failed to cleanup unit "${unit.$name}"`);
      }
    }
  }

  async $prepare(): Promise<void> {
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$prepare?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.$name}"`, err);
      }
    }
    for await (const mod of Object.values(this.modules)) {
      try {
        await mod.$prepare?.();
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
        auth: this.units.auth.auth,
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

  getUnit<K extends keyof FrameworkUnits>(name: K): FrameworkUnits[K] {
    return this.units[name];
  }

  // private async createTenant(tenantId: string): Promise<void> {
  //   const db = await this.units.db.getTenantDb(tenantId);
  //   await context.run(
  //     {
  //       auth: this.units.auth.auth,
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
        auth: this.units.auth.auth,
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
