import type { BranchType, ConnectionNoteType, ConnectionStatus } from "#/types";

import type { JsonValue } from "@aspen-os/platform/server";

export const ORGANIZATION_EVENTS = {
  BRANDING_UPDATED: "organization:branding_updated",
  UPDATED: "organization:updated",
} as const;

export const BRANCH_EVENTS = {
  ACTIVATED: "branch:activated",
  CLOSED: "branch:closed",
  CREATED: "branch:created",
  DEACTIVATED: "branch:deactivated",
  UPDATED: "branch:updated",
} as const;

export const CONNECTION_EVENTS = {
  CREATED: "connection:created",
  NOTE_ADDED: "connection:note_added",
  STATUS_CHANGED: "connection:status_changed",
  UPDATED: "connection:updated",
} as const;

export const events = {
  BRANCH_EVENTS,
  CONNECTION_EVENTS,
  ORGANIZATION_EVENTS,
};

export interface OrganizationUpdatedEvent {
  changes: Record<string, JsonValue>;
  organization: { id: string; name: string; slug: string };
}

export interface OrganizationBrandingUpdatedEvent {
  accentColor?: string;
  logo?: string;
  name?: string;
}

export interface BranchCreatedEvent {
  branch: {
    code: string;
    id: string;
    name: string;
    type: BranchType;
  };
}

export interface BranchUpdatedEvent {
  branch: { id: string; name: string };
  changes: Record<string, JsonValue>;
}

export interface BranchActivatedEvent {
  branchId: string;
}

export interface BranchDeactivatedEvent {
  branchId: string;
}

export interface BranchClosedEvent {
  branchId: string;
  date: string;
}

export interface ConnectionCreatedEvent {
  connection: {
    id: string;
    name: string;
    type: string;
  };
}

export interface ConnectionUpdatedEvent {
  changes: Record<string, JsonValue>;
  connection: { id: string; name: string };
}

export interface ConnectionStatusChangedEvent {
  connectionId: string;
  fromStatus: ConnectionStatus;
  toStatus: ConnectionStatus;
}

export interface ConnectionNoteAddedEvent {
  connectionId: string;
  note: {
    content: string;
    id: string;
    type: ConnectionNoteType;
  };
}

export interface OrganizationEventMap {
  [ORGANIZATION_EVENTS.UPDATED]: OrganizationUpdatedEvent;
  [ORGANIZATION_EVENTS.BRANDING_UPDATED]: OrganizationBrandingUpdatedEvent;
}

export interface BranchEventMap {
  [BRANCH_EVENTS.ACTIVATED]: BranchActivatedEvent;
  [BRANCH_EVENTS.CLOSED]: BranchClosedEvent;
  [BRANCH_EVENTS.CREATED]: BranchCreatedEvent;
  [BRANCH_EVENTS.DEACTIVATED]: BranchDeactivatedEvent;
  [BRANCH_EVENTS.UPDATED]: BranchUpdatedEvent;
}

export interface ConnectionEventMap {
  [CONNECTION_EVENTS.CREATED]: ConnectionCreatedEvent;
  [CONNECTION_EVENTS.NOTE_ADDED]: ConnectionNoteAddedEvent;
  [CONNECTION_EVENTS.STATUS_CHANGED]: ConnectionStatusChangedEvent;
  [CONNECTION_EVENTS.UPDATED]: ConnectionUpdatedEvent;
}

export type OrganizationDomainEventMap = OrganizationEventMap & BranchEventMap & ConnectionEventMap;
