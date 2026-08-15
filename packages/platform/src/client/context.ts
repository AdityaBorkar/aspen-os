import type { AuthClient } from "#/client/auth";
import type { LogsUnit } from "#/client/logs";
import type { RpcUnit } from "#/client/rpc";

declare global {
  var aspen: ClientContext | undefined;
}

export interface ClientContext {
  auth: AuthClient;
  logs: LogsUnit;
  rpc: RpcUnit;
}

let context: ClientContext | null = null;

export function setContext(ctx: ClientContext): void {
  context = ctx;
  globalThis.aspen = ctx;
}

export function getContext(): ClientContext {
  if (!context) {
    throw new Error("Client context was not initialized");
  }
  return context;
}
