import type { InventoryModuleConfig } from "#/types";

export type InventoryRuntimeConfig = Required<InventoryModuleConfig>;

let config: InventoryRuntimeConfig | null = null;

export function setInventoryConfig(value: InventoryRuntimeConfig): void {
  config = Object.freeze({ ...value });
}

export function getInventoryConfig(): InventoryRuntimeConfig {
  if (!config) {
    throw new Error("Inventory config not initialized");
  }
  return config;
}

export function resetInventoryRuntime(): void {
  config = null;
}
