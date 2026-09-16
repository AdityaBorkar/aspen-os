import type { JsonValue } from "@aspen-os/platform/server";

export const ALLOPATHY_EVENTS = {
  CREATED: "emr.allopathy_created",
  UPDATED: "emr.allopathy_updated",
} as const;

export const DENTAL_EVENTS = {
  CREATED: "emr.dental_created",
  UPDATED: "emr.dental_updated",
} as const;

export const AYUSH_EVENTS = {
  CREATED: "emr.ayush_created",
  UPDATED: "emr.ayush_updated",
} as const;

export const REHAB_EVENTS = {
  CREATED: "emr.rehab_created",
  UPDATED: "emr.rehab_updated",
} as const;

export const PSYCH_EVENTS = {
  CREATED: "emr.psych_created",
  UPDATED: "emr.psych_updated",
} as const;

export const events = {
  ALLOPATHY_EVENTS,
  AYUSH_EVENTS,
  DENTAL_EVENTS,
  PSYCH_EVENTS,
  REHAB_EVENTS,
};

export interface EmrEntityEvent {
  actorId?: string;
  at: string;
  branchId: string;
  data?: Record<string, JsonValue>;
  id: string;
}

export interface AllopathyEventMap {
  [ALLOPATHY_EVENTS.CREATED]: EmrEntityEvent;
  [ALLOPATHY_EVENTS.UPDATED]: EmrEntityEvent;
}

export interface DentalEventMap {
  [DENTAL_EVENTS.CREATED]: EmrEntityEvent;
  [DENTAL_EVENTS.UPDATED]: EmrEntityEvent;
}

export interface AyushEventMap {
  [AYUSH_EVENTS.CREATED]: EmrEntityEvent;
  [AYUSH_EVENTS.UPDATED]: EmrEntityEvent;
}

export interface RehabEventMap {
  [REHAB_EVENTS.CREATED]: EmrEntityEvent;
  [REHAB_EVENTS.UPDATED]: EmrEntityEvent;
}

export interface PsychEventMap {
  [PSYCH_EVENTS.CREATED]: EmrEntityEvent;
  [PSYCH_EVENTS.UPDATED]: EmrEntityEvent;
}

export type EmrEventMap = AllopathyEventMap &
  DentalEventMap &
  AyushEventMap &
  RehabEventMap &
  PsychEventMap;
