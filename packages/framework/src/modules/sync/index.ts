import type { Module, ModuleDeps } from "../../lib/types";

export interface SyncConfig {
  provider?: string;
}

export interface SyncModule extends Module {}

export function createSyncModule(_config: SyncConfig = {}): SyncModule {
  return {
    async destroy() {
      // TODO: implement sync teardown
    },

    async healthCheck() {
      return true;
    },

    async initialize(_deps: ModuleDeps) {
      // TODO: implement sync initialization
    },
    name: "sync",
  };
}
