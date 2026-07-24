import type { AuthClient } from "./auth";
import type { LogsUnit } from "./logs";
import type { RpcUnit } from "./rpc";

export interface ClientContext {
  auth: AuthClient;
  logs: LogsUnit;
  rpc: RpcUnit;
}

let context: ClientContext | null = null;

export function setContext(ctx: ClientContext): void {
  context = ctx;
  if (typeof globalThis !== "undefined") {
    (globalThis as unknown as { aspen?: ClientContext }).aspen = ctx;
  }
}

export function getContext(): ClientContext {
  if (!context) throw new Error("Client context was not initialized");
  return context;
}
