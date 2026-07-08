import { type AuthConfig, AuthUnit } from "./auth";
import { type LogConfig, LogUnit } from "./logs";
import { type RpcConfig, RpcUnit } from "./rpc";
import type { Module } from "./types";

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
  private modules: Record<string, Module> = {};
  private initialized: boolean = false;

  constructor(config: FrameworkConfig) {
    this.config = config;
  }

  registerModule(module: Module) {
    if (this.initialized)
      throw new Error("Cannot register module after initialization");
    this.modules[module.name] = module;
  }

  async initialize(): Promise<void> {
    if (this.initialized) throw new Error("Framework already initialized");

    const $config = this.config;
    const auth = new AuthUnit($config.auth);
    const logs = new LogUnit($config.logs);
    const rpc = new RpcUnit($config.rpc);

    this.units = { auth, logs, rpc };
    this.initialized = true;
  }

  async prepare(): Promise<void> {
    if (!this.initialized) throw new Error("Framework not initialized");
    if (!this.units) throw new Error("Could not setup framework units");

    for await (const [name, unit] of Object.entries(this.units)) {
      try {
        await unit?.prepare();
      } catch (err) {
        console.error(`Failed to prepare unit "${name}"`, err);
      }
    }
  }

  async destroy(): Promise<void> {
    for await (const [name, module] of Object.entries(this.modules)) {
      try {
        await module?.destroy();
      } catch {
        console.error(`Failed to destroy module "${name}"`);
      }
    }

    if (!this.units) throw new Error("Could not setup framework units");
    for await (const [name, unit] of Object.entries(this.units)) {
      try {
        await unit?.destroy();
      } catch {
        console.error(`Failed to destroy unit "${name}"`);
      }
    }
    this.initialized = false;
  }

  getModule<N extends keyof typeof this.modules>(name?: N) {
    if (!this.initialized) throw new Error("Framework not initialized");

    if (!name) return this.modules;
    if (!(name in this.modules)) throw new Error(`Unit "${name}" not found`);
    const unit = this.modules[name];
    if (!unit) throw new Error(`Unit "${name}" not initialized`);
    return unit;
  }

  getUnit(name?: keyof Units) {
    if (!this.units) throw new Error("Could not setup framework units");
    if (!this.initialized) throw new Error("Framework not initialized");

    if (!name) return this.units;
    if (!(name in this.units)) throw new Error(`Unit "${name}" not found`);
    const unit = this.units[name];
    if (!unit) throw new Error(`Unit "${name}" not initialized`);
    return unit;
  }
}
