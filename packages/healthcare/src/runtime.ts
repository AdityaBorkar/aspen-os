import type { HealthcareConfig } from "#/types";

export type HealthcareRuntimeConfig = Required<HealthcareConfig>;

let config: HealthcareRuntimeConfig | null = null;

export function setHealthcareConfig(value: HealthcareRuntimeConfig): void {
  config = Object.freeze({ ...value });
}

export function getHealthcareConfig(): HealthcareRuntimeConfig {
  if (!config) {
    throw new Error("Healthcare config not initialized");
  }
  return config;
}

export function resetHealthcareRuntime(): void {
  config = null;
}
