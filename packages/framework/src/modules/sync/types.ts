export interface SyncConfig {
  provider?: string;
}

export interface SyncModule {
  readonly name: string;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  healthCheck(): Promise<boolean>;
}
