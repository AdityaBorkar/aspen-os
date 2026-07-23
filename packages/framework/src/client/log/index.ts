export type { LogConfig } from "./types";

export class LogUnit {
  readonly $name = "logs";

  async $prepareInfra(): Promise<void> {
    throw new Error("LogUnit is not supported on the client side.");
  }

  async $cleanup(): Promise<void> {
    throw new Error("LogUnit is not supported on the client side.");
  }
}
