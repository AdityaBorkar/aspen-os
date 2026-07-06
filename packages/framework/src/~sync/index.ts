export interface SyncConfig {
  provider?: string;
}

export interface SyncUnit {
  destroy(): Promise<void>;
  healthCheck(): Promise<boolean>;
  readonly name: "sync";
}

export function createSyncUnit(_config: SyncConfig = {}): SyncUnit {
  return {
    async destroy() {
      // TODO: implement sync teardown
    },

    async healthCheck() {
      return true;
    },
    name: "sync" as const,
  };
}
