import type { WorkspaceModuleConfig } from "#/types";

export type WorkspaceRuntimeConfig = Required<WorkspaceModuleConfig>;

let config: WorkspaceRuntimeConfig | null = null;

export function setWorkspaceConfig(value: WorkspaceRuntimeConfig): void {
  config = value;
}

export function getWorkspaceConfig(): WorkspaceRuntimeConfig {
  if (!config) {
    throw new Error("Workspace config not initialized");
  }
  return config;
}
