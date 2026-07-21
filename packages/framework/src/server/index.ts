import { drizzle } from "drizzle-orm/node-postgres";

import { type AuthConfig, AuthUnit } from "./auth";
import { context } from "./context";
import { type DatabaseConfig, DatabaseUnit } from "./db";
import { type KvStoreConfig, KvStoreUnit } from "./kv-store";
import { type LogConfig, LogUnit } from "./log";
import { type PubSubConfig, PubSubUnit } from "./pubsub";
import { type RpcConfig, RpcUnit } from "./rpc";
import { type StorageConfig, StorageUnit } from "./storage";
import type {
  TenancyConfig,
  TenancyMode,
  TenantResolver,
} from "./tenancy/types";

export type {
  AuthConfig,
  AuthUnit,
  DatabaseConfig,
  DatabaseUnit,
  KvStoreConfig,
  KvStoreUnit,
  LogConfig,
  LogUnit,
  PubSubConfig,
  PubSubUnit,
  RpcConfig,
  RpcUnit,
  StorageConfig,
  StorageUnit,
  TenancyConfig,
  TenancyMode,
  TenantResolver,
};

export type FrameworkConfig = {
  auth: AuthConfig;
  db: DatabaseConfig;
  kvStore: KvStoreConfig;
  logs: LogConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
  tenancy: TenancyConfig;
};

export type FrameworkUnits = {
  auth: AuthUnit;
  db: DatabaseUnit;
  kvStore: KvStoreUnit;
  logs: LogUnit;
  pubsub: PubSubUnit;
  rpc: RpcUnit;
  storage: StorageUnit;
};

export interface Unit {
  $destroy(): Promise<void>;
  readonly $name: string;
  $prepare?(): Promise<void>;
}

export interface Module<N extends string = string> {
  $destroy(): Promise<void>;
  $initialize?(units: Record<string, Unit>): void;
  readonly $name: N;
  $prepare?(): Promise<void>;
  $prepareTenant?(tenantId: string): Promise<void>;
}

type UnitAccessors = { [K in keyof FrameworkUnits]: FrameworkUnits[K] };
type ModuleAccessors<M extends Record<string, Module>> = {
  [K in keyof M]: M[K];
};

export type FrameworkInstance<M extends Record<string, Module>> = Framework<M> &
  UnitAccessors &
  ModuleAccessors<M>;

export class Framework<M extends Record<string, Module>> {
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
    config: FrameworkConfig,
    modules: M,
  ): FrameworkInstance<M> {
    validateTenancy(config.tenancy);

    const db = new DatabaseUnit(config.db, config.tenancy);
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

    return new Framework<M>(
      units,
      initializedModules as M,
    ) as FrameworkInstance<M>;
  }

  get tenancyMode(): TenancyMode {
    return this.units.db.tenancyMode;
  }

  async prepare(): Promise<void> {
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

    if (this.tenancyMode === "shared-rls") {
      try {
        await this.units.db.applyRlsPolicies(this.units.db.controlPlaneDb);
      } catch (err) {
        console.error("Failed to apply RLS policies", err);
      }
    }

    if (this.tenancyMode === "isolated-db" && this.units.db.tenantResolver) {
      try {
        const tenantIds = await this.units.db.tenantResolver.list();
        for (const tenantId of tenantIds) {
          await this.prepareTenant(tenantId);
        }
      } catch (err) {
        console.error("Failed to prepare tenants", err);
      }
    }
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T>;
  async run<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T>;
  async run<T>(
    tenantIdOrFn: string | (() => T | Promise<T>),
    maybeFn?: () => T | Promise<T>,
  ): Promise<T> {
    if (this.tenancyMode === "single") {
      const fn = typeof tenantIdOrFn === "function" ? tenantIdOrFn : maybeFn;
      if (typeof fn !== "function") {
        throw new Error("run(fn) requires a function argument");
      }
      return context.run(
        {
          auth: this.units.auth.auth,
          db: this.units.db.controlPlaneDb,
          pubsub: this.units.pubsub,
        },
        fn,
      );
    }

    const tenantId = tenantIdOrFn as string;
    if (typeof maybeFn !== "function") {
      throw new Error("run(tenantId, fn) requires a function argument");
    }
    const fn = maybeFn;

    if (this.tenancyMode === "shared-rls") {
      return this.runRls(tenantId, fn);
    }
    return this.runIsolated(tenantId, fn);
  }

  async destroy(): Promise<void> {
    for await (const mod of Object.values(this.modules)) {
      try {
        await mod.$destroy();
      } catch {
        console.error(`Failed to destroy module "${mod.$name}"`);
      }
    }
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$destroy();
      } catch {
        console.error(`Failed to destroy unit "${unit.$name}"`);
      }
    }
  }

  getModule<K extends keyof M>(name: K): M[K] {
    const module = this.modules[name];
    if (!module) throw new Error(`Module "${String(name)}" not found`);
    return module;
  }

  getUnit<K extends keyof FrameworkUnits>(name: K): FrameworkUnits[K] {
    return this.units[name];
  }

  // -------------------------------------------------

  private async prepareTenant(tenantId: string): Promise<void> {
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

  private async runRls<T>(
    tenantId: string,
    fn: () => T | Promise<T>,
  ): Promise<T> {
    const client = await this.units.db.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [
        tenantId,
      ]);
      await client.query("SET LOCAL ROLE tenant_role");
      const db = drizzle(client);
      const result = await context.run(
        {
          auth: this.units.auth.auth,
          db,
          pubsub: this.units.pubsub,
          tenantId,
        },
        fn,
      );
      await client.query("COMMIT");
      return result as T;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  private async runIsolated<T>(
    tenantId: string,
    fn: () => T | Promise<T>,
  ): Promise<T> {
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
}

function validateTenancy(tenancy: unknown): void {
  if (!tenancy || typeof tenancy !== "object") {
    throw new Error(
      "FrameworkConfig.tenancy is required — specify mode: 'single' | 'shared-rls' | 'isolated-db'",
    );
  }
  const t = tenancy as Record<string, unknown>;
  const mode = t.mode;
  const validModes = ["single", "shared-rls", "isolated-db"];
  if (typeof mode !== "string" || !validModes.includes(mode)) {
    throw new Error(
      `Invalid tenancy mode "${mode}" — must be one of: ${validModes.join(", ")}`,
    );
  }
  if (mode === "isolated-db") {
    const resolver = t.tenantResolver as
      | { list?: unknown; resolve?: unknown }
      | undefined;
    if (
      !resolver ||
      typeof resolver.resolve !== "function" ||
      typeof resolver.list !== "function"
    ) {
      throw new Error(
        "isolated-db mode requires tenantResolver with resolve() and list() functions",
      );
    }
  }
}
