import type { Unit } from "../types";
import type { LogLevel } from "./types";

export interface LogsConfig {
  defaultLevel?: LogLevel;
  serviceName?: string;
}

export class LogsUnit implements Unit<LogsConfig> {
  readonly $name = "logs";
  readonly $config: LogsConfig;

  constructor(config: LogsConfig) {
    this.$config = config;
  }
}
