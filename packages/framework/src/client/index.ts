import type { Module } from "../types";
import { type AuthConfig, AuthUnit } from "./auth";
import { type LogConfig, LogUnit } from "./log";
import { type RpcConfig, RpcUnit } from "./rpc";

export type { AuthUnit } from "./auth";

export interface FrameworkConfig {
  auth: AuthConfig;
  logs: LogConfig;
  rpc: RpcConfig;
}

type Units = {
  auth: AuthUnit;
  logs: LogUnit;
  rpc: RpcUnit;
};

export class Framework {
  private config: FrameworkConfig;
  private units: Units | null = null;
  private modules: Module[] = [];

  constructor(config: FrameworkConfig) {
    this.config = config;
  }

  register<M extends Module>(module: M): this {
    if (this.units)
      throw new Error("Cannot register module after initialization");
    this.modules.push(module);
    return this;
  }

  async initialize(): Promise<void> {
    if (this.units) throw new Error("Framework already initialized");

    const c = this.config;
    this.units = {
      auth: new AuthUnit(c.auth),
      logs: new LogUnit(c.logs),
      rpc: new RpcUnit(c.rpc),
    };
  }

  async prepare(): Promise<void> {
    if (!this.units) throw new Error("Framework not initialized");

    for (const unit of Object.values(this.units)) {
      try {
        await unit.prepare?.();
      } catch (err) {
        console.error(`Failed to prepare unit "${unit.name}"`, err);
      }
    }
  }

  async destroy(): Promise<void> {
    for (const mod of this.modules) {
      try {
        await mod.destroy();
      } catch {
        console.error(`Failed to destroy module "${mod.name}"`);
      }
    }

    if (!this.units) throw new Error("Framework not initialized");
    for (const unit of Object.values(this.units)) {
      try {
        await unit.destroy();
      } catch {
        console.error(`Failed to destroy unit "${unit.name}"`);
      }
    }
    this.units = null;
  }

  getModule<T extends Module = Module>(name: string): T {
    if (!this.units) throw new Error("Framework not initialized");
    const mod = this.modules.find((m) => m.name === name);
    if (!mod) throw new Error(`Module "${name}" not found`);
    return mod as T;
  }

  getUnit<K extends keyof Units>(name: K): Units[K] {
    if (!this.units) throw new Error("Framework not initialized");
    return this.units[name];
  }
}
