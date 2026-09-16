import type { JsonValue } from "@aspen-os/platform/server";

export const DIAGNOSTICS_EVENTS = {
  AUTHORIZED: "diagnostics.authorized",
  CREATED: "diagnostics.created",
  UPDATED: "diagnostics.updated",
} as const;

export const events = {
  DIAGNOSTICS_EVENTS,
};

export interface DiagnosticsEntityEvent {
  actorId?: string;
  at: string;
  branchId: string;
  data?: Record<string, JsonValue>;
  id: string;
}

export interface DiagnosticsEventMap {
  [DIAGNOSTICS_EVENTS.AUTHORIZED]: DiagnosticsEntityEvent;
  [DIAGNOSTICS_EVENTS.CREATED]: DiagnosticsEntityEvent;
  [DIAGNOSTICS_EVENTS.UPDATED]: DiagnosticsEntityEvent;
}
