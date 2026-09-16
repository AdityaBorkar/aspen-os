import type { JsonValue } from "@aspen-os/platform/server";

export const NURSING_EVENTS = {
  CREATED: "inpatient.nursing_created",
  ESCALATED: "inpatient.nursing_escalated",
  UPDATED: "inpatient.nursing_updated",
} as const;

export const RESIDENT_EVENTS = {
  CREATED: "inpatient.resident_created",
  UPDATED: "inpatient.resident_updated",
} as const;

export const events = {
  NURSING_EVENTS,
  RESIDENT_EVENTS,
};

export interface InpatientEntityEvent {
  actorId?: string;
  at: string;
  branchId: string;
  data?: Record<string, JsonValue>;
  id: string;
}

export interface NursingEventMap {
  [NURSING_EVENTS.CREATED]: InpatientEntityEvent;
  [NURSING_EVENTS.ESCALATED]: InpatientEntityEvent;
  [NURSING_EVENTS.UPDATED]: InpatientEntityEvent;
}

export interface ResidentEventMap {
  [RESIDENT_EVENTS.CREATED]: InpatientEntityEvent;
  [RESIDENT_EVENTS.UPDATED]: InpatientEntityEvent;
}

export type InpatientEventMap = NursingEventMap & ResidentEventMap;
