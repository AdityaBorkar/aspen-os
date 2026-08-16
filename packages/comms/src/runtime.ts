import type { AuthUnit, DatabaseUnit, KvStoreUnit, PubSubUnit } from "@aspen-os/platform/server";

export interface CommsRuntime {
  auth: AuthUnit;
  db: DatabaseUnit;
  kvStore: KvStoreUnit;
  pubsub: PubSubUnit;
}

let runtime: CommsRuntime | null = null;

export function setCommsRuntime(units: CommsRuntime): void {
  runtime = units;
}

export function getCommsRuntime(): CommsRuntime {
  if (!runtime) {
    throw new Error("Comms runtime units not initialized");
  }
  return runtime;
}
