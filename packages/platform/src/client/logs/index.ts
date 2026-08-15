import type { LogLevel } from "#/client/logs/types";
import type { Unit } from "#/client/types";

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
