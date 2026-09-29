import { AuditUnit } from "#/server/audit";
import { AuthUnit } from "#/server/auth";
import type { AuthConfig } from "#/server/auth";
import { DatabaseUnit, toDatabaseConfig } from "#/server/db";
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

interface CollectedInfra {
  acl: Record<string, readonly string[]>;
  controlPlaneSchemas: SchemaMap;
  tenantSchemas: SchemaMap;
}

function mergeSchemas(target: SchemaMap, source: SchemaMap, origin: string): void {
  for (const [key, schema] of Object.entries(source)) {
    if (key in target && target[key] !== schema) {
      throw new Error(
        `Schema collision: ${origin} schema "${key}" is already provided by another module`,
      );
    }
    target[key] = schema;
  }
}

/**
 * Single aggregation for module schemas and ACLs. Used by both `create()` and
 * `$prepareInfra()` so eager provisioning and infra preparation never drift.
 * Schema collisions throw; ACL actions are deduped per resource.
 */
function collectModuleInfra(modules: readonly Module[]): CollectedInfra {
  const controlPlaneSchemas: SchemaMap = {};
  const tenantSchemas: SchemaMap = {};
  const actionsByResource = new Map<string, Set<string>>();
  for (const mod of modules) {
    const infra = mod.$prepareInfra?.();
    if (!infra) {
      continue;
    }
    mergeSchemas(
      controlPlaneSchemas,
      infra.db.control_plane_schemas,
      `module "${mod.$name}" control-plane`,
    );
    mergeSchemas(tenantSchemas, infra.db.tenant_schemas, `module "${mod.$name}" tenant`);
    for (const [resource, actions] of Object.entries(infra.auth.acl)) {
      let seen = actionsByResource.get(resource);
      if (!seen) {
        seen = new Set();
        actionsByResource.set(resource, seen);
      }
      for (const action of actions) {
        seen.add(action);
      }
    }
  }
  const acl: Record<string, readonly string[]> = {};
  for (const [resource, seen] of actionsByResource) {
    acl[resource] = [...seen];
  }
  return { acl, controlPlaneSchemas, tenantSchemas };
}

async function prepareWithLabel(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new Error(
      `Failed to prepare unit "${name}": ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

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
  readonly #moduleByName = new Map<string, Module>();

  constructor(units: PlatformUnits<TSchemas>, modules: TModules) {
    this.units = units;
    this.modules = modules;
    for (const mod of modules) {
      this.#moduleByName.set(mod.$name, mod);
    }
    return new Proxy(this, {
      get(target, prop, _receiver) {
        if (prop in target.units) {
          // SAFETY: proxy access for a unit name resolves to the matching unit.
          return target.units[prop as keyof PlatformUnits<TSchemas>];
        }
        // SAFETY: module `$name` keys are strings; symbol keys miss the map
        // and fall through to the wrapped instance below.
        const mod = target.#moduleByName.get(prop as string);
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
    const db = new DatabaseUnit<MergedSchemas<TModules>>(toDatabaseConfig(config.db));
    const core = IsolatedTenantPlatform.createCore<TModules, MergedSchemas<TModules>>(
      db,
      config,
      modules,
    );
    // Aggregate module schemas eagerly so `provisionTenant` pushes complete
    // tenant databases in any process — not only ones that ran $prepareInfra.
    // (Previously tenants onboarded from the dev server/seed got platform
    // tables only, silently missing all domain tables.)
    const { controlPlaneSchemas, tenantSchemas } = collectModuleInfra(modules);
    db.setStoredSchemas(controlPlaneSchemas, tenantSchemas);
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
    const { acl, controlPlaneSchemas, tenantSchemas } = collectModuleInfra(this.modules);
    await this.prepareUnits(controlPlaneSchemas, tenantSchemas, acl);
    await this.prepareRuntimeModules();
    await this.prepareTenantModules();
  }

  private async prepareUnits(
    controlPlaneSchemas: SchemaMap,
    tenantSchemas: SchemaMap,
    acl: Record<string, readonly string[]>,
  ): Promise<void> {
    // db and auth have no ordering dependency; remaining units are independent.
    await Promise.all([
      prepareWithLabel(this.units.db.$name, () =>
        this.units.db.$prepareInfra(controlPlaneSchemas, tenantSchemas),
      ),
      prepareWithLabel(this.units.auth.$name, () => this.units.auth.$prepareInfra(acl)),
    ]);
    const rest = Object.values(this.units).filter(
      (unit) => unit.$name !== "db" && unit.$name !== "auth",
    );
    await Promise.all(
      rest.map((unit) =>
        prepareWithLabel(unit.$name, () => unit.$prepareInfra?.() ?? Promise.resolve()),
      ),
    );
  }

  private async prepareRuntimeModules(): Promise<void> {
    const outcomes = await Promise.allSettled(
      this.modules.map((mod) => this.run("$global", () => mod.$prepareRuntime?.())),
    );
    const failures: unknown[] = [];
    outcomes.forEach((outcome, index) => {
      if (outcome.status === "rejected") {
        const name = this.modules[index]?.$name ?? `#${index}`;
        const message =
          outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
        failures.push(
          new Error(`Failed to prepare module "${name}": ${message}`, { cause: outcome.reason }),
        );
      }
    });
    if (failures.length > 0) {
      throw new AggregateError(failures, `Failed to prepare ${failures.length} module(s)`);
    }
  }

  private async prepareTenantModules(): Promise<void> {
    const tenantIds = (await this.units.db.resolver?.list()) ?? [];
    const outcomes = await Promise.allSettled(
      tenantIds.map((tenantId) => this.prepareOneTenant(tenantId)),
    );
    const failures: unknown[] = [];
    for (const outcome of outcomes) {
      if (outcome.status === "rejected") {
        failures.push(outcome.reason);
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, `Failed to prepare ${failures.length} tenant(s)`);
    }
  }

  private async prepareOneTenant(tenantId: string): Promise<void> {
    await this.run(tenantId, async () => {
      const outcomes = await Promise.allSettled(
        this.modules.map((mod) => mod.$prepareTenant?.(tenantId) ?? Promise.resolve()),
      );
      const failures: unknown[] = [];
      outcomes.forEach((outcome, index) => {
        if (outcome.status === "rejected") {
          const name = this.modules[index]?.$name ?? `#${index}`;
          const message =
            outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
          failures.push(
            new Error(`Failed to prepare tenant "${tenantId}" for module "${name}": ${message}`, {
              cause: outcome.reason,
            }),
          );
        }
      });
      if (failures.length > 0) {
        throw new AggregateError(
          failures,
          `Failed to prepare tenant "${tenantId}" for ${failures.length} module(s)`,
        );
      }
    });
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
    const mod = this.#moduleByName.get(name);
    if (!mod) {
      throw new Error(`Module "${name}" not found`);
    }
    // SAFETY: the by-name map is built from this.modules, so a hit for `name`
    // is the module whose `$name` equals `name`.
    return mod as ModuleByName<TModules, TKey>;
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
