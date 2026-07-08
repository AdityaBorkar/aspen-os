import type { LoggingConfig } from "./types";

export class LoggingUnit {
  readonly name = "logs";

  constructor(_config: LoggingConfig) {}

  async prepare(): Promise<void> {
    throw new Error("LoggingUnit is not supported on the client side.");
  }

  async destroy(): Promise<void> {
    throw new Error("LoggingUnit is not supported on the client side.");
  }
}
