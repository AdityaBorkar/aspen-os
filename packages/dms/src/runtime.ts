import type { StorageUnit } from "@aspen-os/platform/server";

import type { DmsModuleConfig } from "./types";

export type DmsRuntimeConfig = Required<DmsModuleConfig>;

let storage: StorageUnit | null = null;
let config: DmsRuntimeConfig | null = null;

export function setDmsStorage(unit: StorageUnit): void {
  storage = unit;
}

export function getDmsStorage(): StorageUnit {
  if (!storage) {
    throw new Error("DMS storage unit not initialized");
  }
  return storage;
}

export function setDmsConfig(value: DmsRuntimeConfig): void {
  config = value;
}

export function getDmsConfig(): DmsRuntimeConfig {
  if (!config) {
    throw new Error("DMS config not initialized");
  }
  return config;
}
