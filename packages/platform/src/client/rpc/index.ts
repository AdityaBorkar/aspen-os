import type { Unit } from "../types";

export interface RpcConfig {
  prefix?: string;
}

export class RpcUnit implements Unit<RpcConfig> {
  readonly $name = "rpc";
  readonly $config: RpcConfig;
  readonly prefix: string;

  constructor(config: RpcConfig) {
    this.$config = config;
    this.prefix = config.prefix ?? "";
  }
}
