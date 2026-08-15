import type { Module, PlatformUnits, TenancyMode, UnitAccessors } from "#/server";
import { AuditUnit } from "#/server/audit";
import { AuthUnit } from "#/server/auth";
import type { AuthConfig } from "#/server/auth";
import type { DatabaseUnit } from "#/server/db";
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
import type { SchemaMap } from "#/server/types";
import { context } from "#/server/utils/context";

import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

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

/**
 * A single connectivity probe result.
 */
export interface HealthCheckResult {
  /** "ok" when the dependency answered the probe, otherwise "unhealthy". */
  status: "ok" | "unhealthy";
  /** Round-trip latency of the probe in milliseconds, when it succeeded. */
  latencyMs?: number;
  /** Reason for failure, when the probe did not succeed. */
  error?: string;
}

/**
 * Aggregate health report returned by {@link BasePlatform.healthCheck}.
 */
export interface HealthReport {
  /** "ok" only when every check passed, otherwise "unhealthy". */
  status: "ok" | "unhealthy";
  checks: {
    db: HealthCheckResult;
    pubsub: HealthCheckResult;
  };
  /**
   * Topics that have been produced to (via publish/publishBatch) but have no
   * registered subscriber. pg-boss silently drops these, so they flag a likely
   * producer/consumer wiring bug. Present only when there are any.
   */
  unsubscribedTopics?: string[];
  tenancyMode: TenancyMode;
  /** ISO timestamp of when the check ran. */
  at: string;
}

const PUBSUB_HEALTH_PROBE_TOPIC = "__platform_health_check";

/** Units + modules assembled by {@link BasePlatform.createCore}. */
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

export abstract class BasePlatform<
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

  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    this.units = units;
    this.modules = modules;
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

  protected static createCore<TModules extends Module[], TSchemas extends SchemaMap>(
    db: DatabaseUnit<TSchemas>,
    config: CommonConfig,
    modules: TModules,
  ): CoreUnits<TModules, TSchemas> {
    const logs = new LogUnit(config.logs, { db });
    const audit = new AuditUnit({ db });
    const pubsub = new PubSubUnit(config.pubsub, { db });
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

  get tenancyMode(): TenancyMode {
    return this.units.db.tenancyMode;
  }

  async $prepareInfra(): Promise<void> {
    console.log("Preparing INFRA");
    // oxlint-disable eslint/no-await-in-loop
    for (const unit of Object.values(this.units)) {
      try {
        console.log("PROCESSING:", unit.$name);
        await unit.$prepareInfra?.();
        console.log("DONE:", unit.$name);
      } catch (error) {
        console.error(`Failed to prepare unit "${unit.$name}"`, error);
      }
    }
    // oxlint-enable eslint/no-await-in-loop
    console.log("Done unit infra");

    const mergedControlPlaneSchemas: SchemaMap = {};
    const mergedTenantSchemas: SchemaMap = {};
    const mergedAcl: Record<string, string[]> = {};

    for (const mod of this.modules) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(mergedControlPlaneSchemas, infra.db.control_plane_schemas);
        Object.assign(mergedTenantSchemas, infra.db.tenant_schemas);
        for (const [resource, actions] of Object.entries(infra.auth.acl)) {
          if (!mergedAcl[resource]) {
            mergedAcl[resource] = [];
          }
          mergedAcl[resource] = [...mergedAcl[resource], ...actions];
        }
      }
    }
    console.log("Done merged schemas");

    await this.units.db.prepareWithModules(mergedControlPlaneSchemas, mergedTenantSchemas);
    this.units.auth.applyModuleAcl(mergedAcl);
    console.log("Done db prepare");

    // oxlint-disable eslint/no-await-in-loop
    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$prepareRuntime?.());
      } catch (error) {
        console.error(`Failed to prepare module "${mod.$name}"`, error);
      }
    }
    // oxlint-enable eslint/no-await-in-loop
    console.log("Done module prepare");
  }

  async $cleanup(): Promise<void> {
    // oxlint-disable eslint/no-await-in-loop
    for (const mod of this.modules) {
      try {
        await this.runInContext(() => mod.$cleanup());
      } catch {
        console.error(`Failed to destroy module "${mod.$name}"`);
      }
    }
    // oxlint-enable eslint/no-await-in-loop
    // oxlint-disable eslint/no-await-in-loop
    for (const unit of Object.values(this.units)) {
      try {
        await unit.$cleanup();
      } catch {
        console.error(`Failed to destroy unit "${unit.$name}"`);
      }
    }
    // oxlint-enable eslint/no-await-in-loop
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

  protected runInContext<TValue>(
    fn: () => TValue | Promise<TValue>,
    overrides?: {
      db?: NodePgDatabase<TSchemas>;
      tenantId?: string;
    },
  ): TValue | Promise<TValue> {
    const ctx = {
      audit: this.units.audit,
      auth: this.units.auth,
      db: this.units.db.controlPlaneDb,
      pubsub: this.units.pubsub,
      ...overrides,
    };

    return context.run(ctx, fn);
  }

  /**
   * Probe the DB and PubSub units for connectivity and report their status.
   *
   * The check is best-effort: a failure in one dependency does not prevent
   * the other from being probed. Returns an aggregate {@link HealthReport}.
   */
  /**
   * Probe the DB and PubSub units for connectivity and report their status.
   *
   * The check is best-effort: a failure in one dependency does not prevent
   * the other from being probed. Returns an aggregate {@link HealthReport}.
   * Derived platform classes may override {@link checkDbHealth} or
   * {@link checkPubSubHealth} to add mode-specific probes.
   */
  async healthCheck(): Promise<HealthReport> {
    const dbResult = await this.checkDbHealth();
    const pubsubResult = await this.checkPubSubHealth();

    const unsubscribedTopics = this.units.pubsub.getUnsubscribedProducedTopics();

    const overall: "ok" | "unhealthy" =
      dbResult.status === "ok" && pubsubResult.status === "ok" && unsubscribedTopics.length === 0
        ? "ok"
        : "unhealthy";

    const report: HealthReport = {
      at: new Date().toISOString(),
      checks: { db: dbResult, pubsub: pubsubResult },
      status: overall,
      tenancyMode: this.tenancyMode,
    };

    if (unsubscribedTopics.length > 0) {
      // Topics produced to but with no registered consumer: pg-boss silently
      // Drops these messages. Flag them and mark the whole report unhealthy so
      // Monitoring surfaces the wiring bug early.
      report.unsubscribedTopics = unsubscribedTopics;
    }

    return report;
  }

  protected async checkDbHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      await this.units.db.controlPlaneDb.execute(sql`SELECT 1`);
      return { latencyMs: Math.round(performance.now() - start), status: "ok" };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        status: "unhealthy",
      };
    }
  }

  protected async checkPubSubHealth(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      // Lazily starts the control-plane pg-boss (proving it can connect to
      // The database), then performs a live SQL round-trip against a queue.
      // GetQueueSize works on unregistered topics and has no side effects.
      await this.units.pubsub.getQueueSize(PUBSUB_HEALTH_PROBE_TOPIC);
      return { latencyMs: Math.round(performance.now() - start), status: "ok" };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        status: "unhealthy",
      };
    }
  }
}
