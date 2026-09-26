import type { StorageUnit } from "@aspen-os/platform/server";

let storage: StorageUnit | null = null;

export function setManagementStorage(unit: StorageUnit): void {
  storage = unit;
}

export function getManagementStorage(): StorageUnit {
  if (!storage) {
    throw new Error("Management storage unit not initialized");
  }
  return storage;
}

export function resetManagementRuntime(): void {
  storage = null;
}
