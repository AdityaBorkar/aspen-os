import type { Unit, UnitDeps } from "../types";

export interface SyncConfig {
  provider?: string;
}

export interface SyncUnit extends Unit {}

export function createSyncUnit(_config: SyncConfig = {}): SyncUnit {
  return {
    async destroy() {
      // TODO: implement sync teardown
    },

    async healthCheck() {
      return true;
    },

    async initialize(_deps: UnitDeps) {
      // TODO: implement sync initialization
    },
    name: "sync",
  };
}
