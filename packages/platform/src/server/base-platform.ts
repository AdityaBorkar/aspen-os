import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { AuditUnit } from "./audit";
import { type AuthConfig, AuthUnit } from "./auth";
import type { DatabaseUnit } from "./db";
import type {
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
import { context } from "./utils/context";

export type ExtractModuleNames<M extends Module[]> = {
  [K in keyof M]: M[K] extends { $name: infer N extends string } ? N : never;
};

export type ModuleByName<
  M extends Module[],
  K extends M[number]["$name"],
> = Extract<M[number], { $name: K }>;

type UnionToIntersection<T> = (
  T extends unknown
    ? (x: T) => void
    : never
) extends (x: infer R) => void
  ? R
  : never;

export type InferControlPlaneSchemas<M extends Module[]> = UnionToIntersection<
  M[number] extends Module<infer _N, infer TCP, infer _TT> ? TCP : never
>;

export type InferTenantSchemas<M extends Module[]> = UnionToIntersection<
  M[number] extends Module<infer _N, infer _TCP, infer TT> ? TT : never
>;

export type MergedSchemas<M extends Module[]> = InferControlPlaneSchemas<M> &
  InferTenantSchemas<M> &
  Record<string, unknown>;

export type CommonConfig = {
  auth: AuthConfig;
  kvStore: KvStoreConfig;
  logs: LogConfig;
  pubsub: PubSubConfig;
  rpc: RpcConfig;
  storage: StorageConfig;
};

export abstract class BasePlatform<
  M extends Module[],
  S extends Record<string, unknown> = MergedSchemas<M>,
> implements UnitAccessors<S>
{
  declare readonly audit: PlatformUnits<S>["audit"];
  declare readonly auth: PlatformUnits<S>["auth"];
  declare readonly db: PlatformUnits<S>["db"];
  declare readonly kvStore: PlatformUnits<S>["kvStore"];
  declare readonly logs: PlatformUnits<S>["logs"];
  declare readonly pubsub: PlatformUnits<S>["pubsub"];
  declare readonly rpc: PlatformUnits<S>["rpc"];
  declare readonly storage: PlatformUnits<S>["storage"];

  constructor(
    protected readonly units: PlatformUnits<S>,
    protected readonly modules: M,
  ) {
    // biome-ignore lint/correctness/noConstructorReturn: Exception
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const unit = target.units[prop as keyof PlatformUnits<S>];
          if (unit) return unit;
          const mod = target.modules.find((m) => m.$name === prop);
          if (mod) return mod;
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as this &
      PlatformUnits<S> & {
        [K in M[number]["$name"]]: Extract<M[number], { $name: K }>;
      };
  }

  protected static createCore<
    M extends Module[],
    S extends Record<string, unknown>,
  >(
    db: DatabaseUnit<S>,
    config: CommonConfig,
    modules: M,
  ): { units: PlatformUnits<S>; modules: M } {
    const logs = new LogUnit(config.logs, { db });
    const audit = new AuditUnit({ db });
    const pubsub = new PubSubUnit(config.pubsub, { db });
    const auth = new AuthUnit(config.auth, { db, pubsub });
    pubsub.setAuth(auth);
    const storage = new StorageUnit(config.storage, { db });
    const kvStore = new KvStoreUnit(config.kvStore, { db });
    const rpc = new RpcUnit(config.rpc, { auth, db, logs, pubsub });

    const units = { audit, auth, db, kvStore, logs, pubsub, rpc, storage };

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

    return { modules, units };
  }

  get tenancyMode(): TenancyMode {
    return this.units.db.tenancyMode;
  }

  async $prepareInfra(): Promise<void> {
    for (const unit of Object.values(this.units)) {
      try {
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

  getModule<K extends M[number]["$name"]>(name: K): ModuleByName<M, K> {
    const mod = this.modules.find((m) => m.$name === name);
    if (!mod) throw new Error(`Module "${String(name)}" not found`);
    return mod as ModuleByName<M, K>;
  }

  getUnit<K extends keyof PlatformUnits<S>>(name: K): PlatformUnits<S>[K] {
    return this.units[name];
  }

  protected runInContext<T>(
    fn: () => T | Promise<T>,
    overrides?: {
      db?: NodePgDatabase<S>;
      tenantId?: string;
    },
  ): T | Promise<T> {
    const ctx = {
      audit: this.units.audit,
      auth: this.units.auth,
      db: this.units.db.controlPlaneDb as unknown as NodePgDatabase<
        Record<string, unknown>
      >,
      pubsub: this.units.pubsub,
      ...overrides,
    };
    return context.run(ctx, fn);
  }
}
