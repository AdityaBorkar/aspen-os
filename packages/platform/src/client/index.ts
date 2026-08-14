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
  [TKey in keyof PlatformUnits]: PlatformUnits[TKey];
};

type ExtractModuleNames<TModules extends Module[]> = {
  [TKey in keyof TModules]: TModules[TKey] extends { $name: infer TName extends string }
    ? TName
    : never;
};

export type ModuleAccessors<TModules extends Module[], Names extends TModules[number]["$name"]> = {
  [TKey in Names]: Extract<TModules[number], { $name: TKey }>;
};

export type PlatformInstance<TModules extends Module[]> = Platform<TModules> &
  UnitAccessors &
  ModuleAccessors<TModules, ExtractModuleNames<TModules>[number]>;

export class Platform<TModules extends Module[]> implements UnitAccessors {
  declare readonly auth: PlatformUnits["auth"];
  declare readonly logs: PlatformUnits["logs"];
  declare readonly rpc: PlatformUnits["rpc"];

  static create<TModules extends Module[]>(
    config: {
      auth: AuthConfig;
      logs: LogsConfig;
      rpc: RpcConfig;
    },
    modules: TModules,
  ): PlatformInstance<TModules> {
    const auth = new AuthUnit(config.auth);
    const logs = new LogsUnit(config.logs);
    const rpc = new RpcUnit(config.rpc);

    const units = { auth, logs, rpc };

    const modulesRecord = {} as Record<string, Module>;
    for (const mod of modules) {
      modulesRecord[mod.$name] = mod;
    }

    return new Platform(units, modulesRecord) as PlatformInstance<TModules>;
  }

  constructor(
    private readonly units: PlatformUnits,
    private readonly modules: Record<string, Module>,
  ) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const unit = target.units[prop as keyof PlatformUnits];
          if (unit) {
            return unit;
          }
        }
        if (typeof prop === "string") {
          const mod = target.modules[prop];
          if (mod) {
            return mod;
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  getModule<TKey extends TModules[number]["$name"]>(
    name: TKey,
  ): Extract<TModules[number], { $name: TKey }> {
    const module = this.modules[name];
    if (!module) {
      throw new Error(`Module "${String(name)}" not found`);
    }
    return module as Extract<TModules[number], { $name: TKey }>;
  }

  getUnit<TKey extends keyof PlatformUnits>(name: TKey): PlatformUnits[TKey] {
    return this.units[name];
  }

  run<TValue>(fn: () => TValue): TValue {
    const auth = this.units.auth.client;
    const { logs } = this.units;
    const { rpc } = this.units;
    setContext({ auth, logs, rpc });
    return fn();
  }
}
