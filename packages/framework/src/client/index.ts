import { type AuthConfig, AuthUnit } from "./auth";
import { setContext } from "./context";
import { type LogConfig, LogUnit } from "./log";
import { type RpcConfig, RpcUnit } from "./rpc";

export { createAccessControl } from "better-auth/plugins/access";

export type { AuthClient, AuthUnit } from "./auth";
export type { LogConfig } from "./log";
export type { RpcConfig } from "./rpc";

export type FrameworkConfig = {
  auth: AuthConfig;
  logs: LogConfig;
  rpc: RpcConfig;
};

export type FrameworkUnits = {
  auth: AuthUnit;
  logs: LogUnit;
  rpc: RpcUnit;
};

export type ModuleInfra = {
  auth: {
    acl: Record<string, { allowedActions: string[] }>;
  };
  db: {
    schemas: Record<string, unknown>;
  };
  events: Record<string, Record<string, string>>;
};

export interface Unit {
  $cleanup(): Promise<void>;
  readonly $name: string;
  $prepareInfra?(): Promise<void>;
}

export interface Module<N extends string = string> {
  $cleanup(): Promise<void>;
  $initialize?(units: Record<string, Unit>): void;
  readonly $name: N;
  $prepareInfra?(): ModuleInfra;
  $prepareRuntime?(): Promise<void>;
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
    const auth = new AuthUnit(config.auth);
    const logs = new LogUnit();
    const rpc = new RpcUnit();

    const units: FrameworkUnits = {
      auth,
      logs,
      rpc,
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

  async prepareInfra(): Promise<void> {
    for await (const unit of Object.values(this.units)) {
      try {
        await unit.$prepareInfra?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.$name}"`, err);
      }
    }
    const mergedModuleSchemas: Record<string, unknown> = {};
    for (const mod of Object.values(this.modules)) {
      const infra = mod.$prepareInfra?.();
      if (infra) {
        Object.assign(mergedModuleSchemas, infra.db.schemas);
      }
    }
    for await (const mod of Object.values(this.modules)) {
      try {
        await mod.$prepareRuntime?.();
      } catch (err) {
        console.error(`Failed to prepare module "${mod.$name}"`, err);
      }
    }
    setContext({
      auth: this.units.auth.client,
      rpc: this.units.rpc,
    });
  }

  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    setContext({
      auth: this.units.auth.client,
      rpc: this.units.rpc,
    });
    return fn();
  }

  async destroy(): Promise<void> {
    for await (const mod of Object.values(this.modules)) {
      try {
        await mod.$cleanup();
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

  getModule<K extends keyof M>(name: K): M[K] {
    const module = this.modules[name];
    if (!module) throw new Error(`Module "${String(name)}" not found`);
    return module;
  }

  getUnit<K extends keyof FrameworkUnits>(name: K): FrameworkUnits[K] {
    return this.units[name];
  }
}
