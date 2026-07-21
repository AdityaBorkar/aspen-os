export type { LogConfig } from "./types";

export class LogUnit {
  readonly $name = "logs";

  async $prepare(): Promise<void> {
    throw new Error("LogUnit is not supported on the client side.");
  }

  async $destroy(): Promise<void> {
    throw new Error("LogUnit is not supported on the client side.");
  }
}
