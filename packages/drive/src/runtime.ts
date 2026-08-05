import type { StorageUnit } from "@aspen-os/platform/server";

import type { DriveModuleConfig } from "./types";

export type DriveRuntimeConfig = Required<DriveModuleConfig>;

let storage: StorageUnit | null = null;
let config: DriveRuntimeConfig | null = null;

export function setDriveStorage(unit: StorageUnit): void {
  storage = unit;
}

export function getDriveStorage(): StorageUnit {
  if (!storage) {
    throw new Error("Drive storage unit not initialized");
  }
  return storage;
}

export function setDriveConfig(value: DriveRuntimeConfig): void {
  config = value;
}

export function getDriveConfig(): DriveRuntimeConfig {
  if (!config) {
    throw new Error("Drive config not initialized");
  }
  return config;
}
