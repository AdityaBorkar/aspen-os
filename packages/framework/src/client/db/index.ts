import type { DatabaseConfig } from "../types";

export class DatabaseUnit {
  readonly name = "database";

  constructor(_config: DatabaseConfig) {
    throw new Error(
      "DatabaseUnit is not supported on the client side. Use server-side framework instead.",
    );
  }

  async prepare(): Promise<void> {
    throw new Error("DatabaseUnit is not supported on the client side.");
  }

  async destroy(): Promise<void> {
    throw new Error("DatabaseUnit is not supported on the client side.");
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}
