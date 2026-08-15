import { AuthUnit } from "#/client/auth";
import type { AuthConfig } from "#/client/auth";
import { setContext } from "#/client/context";
import { LogsUnit } from "#/client/logs";
import type { LogsConfig } from "#/client/logs";
import { RpcUnit } from "#/client/rpc";
import type { RpcConfig } from "#/client/rpc";
import type { Module } from "#/client/types";

export interface PlatformUnits {
  auth: AuthUnit;
  logs: LogsUnit;
  rpc: RpcUnit;
}

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

  private readonly modules: Record<string, Module>;
  private readonly units: PlatformUnits;

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

    const modulesRecord: Record<string, Module> = {};
    for (const mod of modules) {
      modulesRecord[mod.$name] = mod;
    }

    // SAFETY: modules is a typed Module[] whose $name keys map 1:1 into the record.
    return new Platform(units, modulesRecord) as PlatformInstance<TModules>;
  }

  constructor(units: PlatformUnits, modules: Record<string, Module>) {
    this.units = units;
    this.modules = modules;
    return new Proxy(this, {
      get(target, prop, _receiver) {
        if (prop in target.units) {
          // SAFETY: proxy access for a unit name resolves to the matching unit.
          return target.units[prop as keyof PlatformUnits];
        }
        if (prop in target.modules) {
          // SAFETY: module names are string keys on the modules record.
          return target.modules[prop as string];
        }
        // SAFETY: fall through to the wrapped platform instance's own members.
        return target[prop as keyof typeof target];
      },
    });
  }

  getModule<TKey extends TModules[number]["$name"]>(
    name: TKey,
  ): Extract<TModules[number], { $name: TKey }> {
    const module = Object.values(this.modules).find(
      (mod): mod is Extract<TModules[number], { $name: TKey }> => mod.$name === name,
    );
    if (!module) {
      throw new Error(`Module "${name}" not found`);
    }
    return module;
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
