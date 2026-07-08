import type { LogConfig } from "./types";

export type { LogConfig } from "./types";

export class LogUnit {
  readonly name = "logs";

  constructor(_config: LogConfig) {}

  async prepare(): Promise<void> {
    throw new Error("LogUnit is not supported on the client side.");
  }

  async destroy(): Promise<void> {
    throw new Error("LogUnit is not supported on the client side.");
  }
}
