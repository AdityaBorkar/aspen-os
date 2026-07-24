import { type AuthConfig, AuthUnit } from "./auth";
import { setContext } from "./context";
import { type LogsConfig, LogsUnit } from "./logs";
import { type RpcConfig, RpcUnit } from "./rpc";
import type { Module } from "./types";

export type PlatformUnits = {
  auth: AuthUnit;
  logs: LogsUnit;
  rpc: RpcUnit;
};

export type UnitAccessors = {
  [K in keyof PlatformUnits]: PlatformUnits[K];
};

type ExtractModuleNames<M extends Module[]> = {
  [K in keyof M]: M[K] extends { $name: infer N extends string } ? N : never;
};

export type ModuleAccessors<Names extends string> = {
  [K in Names]: Extract<Module, { $name: K }>;
};

export type PlatformInstance<M extends Module[]> = Platform<M> &
  UnitAccessors &
  ModuleAccessors<ExtractModuleNames<M>[number]>;

export class Platform<M extends Module[]> {
  static create<M extends Module[]>(
    config: {
      auth: AuthConfig;
      logs: LogsConfig;
      rpc: RpcConfig;
    },
    modules: M,
  ): PlatformInstance<M> {
    const auth = new AuthUnit(config.auth);
    const logs = new LogsUnit(config.logs);
    const rpc = new RpcUnit(config.rpc);

    const units = { auth, logs, rpc };

    const modulesRecord = {} as Record<string, Module>;
    for (const mod of modules) {
      modulesRecord[mod.$name] = mod;
    }

    return new Platform(units, modulesRecord) as unknown as PlatformInstance<M>;
  }

  constructor(
    private readonly units: PlatformUnits,
    private readonly modules: Record<string, Module>,
  ) {
    // biome-ignore lint/correctness/noConstructorReturn: Exception
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const unit = target.units[prop as keyof PlatformUnits];
          if (unit) return unit;
        }
        if (typeof prop === "string") {
          const mod = target.modules[prop];
          if (mod) return mod;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  getModule<K extends M[number]["$name"]>(
    name: K,
  ): Extract<M[number], { $name: K }> {
    const module = this.modules[name];
    if (!module) throw new Error(`Module "${String(name)}" not found`);
    return module as Extract<M[number], { $name: K }>;
  }

  getUnit<K extends keyof PlatformUnits>(name: K): PlatformUnits[K] {
    return this.units[name];
  }

  run<T>(fn: () => T): T {
    const auth = this.units.auth.client;
    const logs = this.units.logs;
    const rpc = this.units.rpc;
    setContext({ auth, logs, rpc });
    return fn();
  }
}
