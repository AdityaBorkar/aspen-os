import type { CalendarModuleConfig } from "#/types";

export type CalendarRuntimeConfig = Required<CalendarModuleConfig>;

let config: CalendarRuntimeConfig | null = null;

export function setCalendarConfig(value: CalendarRuntimeConfig): void {
  config = value;
}

export function getCalendarConfig(): CalendarRuntimeConfig {
  if (!config) {
    throw new Error("Calendar config not initialized");
  }
  return config;
}
