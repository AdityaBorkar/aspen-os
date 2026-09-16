import type { JsonValue } from "@aspen-os/platform/server";

export const PHARMACY_EVENTS = {
  CREATED: "pharmacy.created",
  DISPENSED: "pharmacy.dispensed",
  UPDATED: "pharmacy.updated",
} as const;

export const events = {
  PHARMACY_EVENTS,
};

export interface PharmacyEntityEvent {
  actorId?: string;
  at: string;
  branchId: string;
  data?: Record<string, JsonValue>;
  id: string;
}

export interface PharmacyEventMap {
  [PHARMACY_EVENTS.CREATED]: PharmacyEntityEvent;
  [PHARMACY_EVENTS.DISPENSED]: PharmacyEntityEvent;
  [PHARMACY_EVENTS.UPDATED]: PharmacyEntityEvent;
}
