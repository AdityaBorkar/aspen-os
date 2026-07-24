import { type AuthConfig, AuthUnit } from "./auth";
import { setContext } from "./context";
import { type LogsConfig, LogsUnit } from "./logs";
import { type RpcConfig, RpcUnit } from "./rpc";
import type { Module } from "./types";

type PlatformUnits = {
  auth: AuthUnit;
  logs: LogsUnit;
  rpc: RpcUnit;
};

type PlatformModules = Record<string, Module>;

type UnitAccessors<U extends PlatformUnits> = { [K in keyof U]: U[K] };

type ModuleAccessors<M extends PlatformModules> = { [K in keyof M]: M[K] };

export type PlatformInstance<
  U extends PlatformUnits,
  M extends PlatformModules,
> = Platform<U, M> & UnitAccessors<U> & ModuleAccessors<M>;

export class Platform<U extends PlatformUnits, M extends PlatformModules> {
  static create<M extends Module[]>(
    config: {
      auth: AuthConfig;
      logs: LogsConfig;
      rpc: RpcConfig;
    },
    modules: M,
  ): PlatformInstance<
    PlatformUnits,
    { [K in M[number]["$name"]]: Extract<M[number], { $name: K }> }
  > {
    const auth = new AuthUnit(config.auth);
    const logs = new LogsUnit(config.logs);
    const rpc = new RpcUnit(config.rpc);

    const units = { auth, logs, rpc };

    const modulesRecord = {} as Record<string, Module>;
    for (const mod of modules) {
      modulesRecord[mod.$name] = mod;
    }

    return new Platform(units, modulesRecord) as PlatformInstance<
      PlatformUnits,
      { [K in M[number]["$name"]]: Extract<M[number], { $name: K }> }
    >;
  }

  constructor(
    private readonly units: U,
    private readonly modules: M,
  ) {
    // biome-ignore lint/correctness/noConstructorReturn: Exception
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === "string") {
          const unit = target.units[prop as keyof U];
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

  getModule<K extends keyof M>(name: K): M[K] {
    const module = this.modules[name];
    if (!module) throw new Error(`Module "${String(name)}" not found`);
    return module;
  }

  getUnit<K extends keyof U>(name: K): U[K] {
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
