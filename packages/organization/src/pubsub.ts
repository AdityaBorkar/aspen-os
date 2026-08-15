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

export const events = {
  BRANCH_EVENTS,
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
    type: string;
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

export type OrganizationDomainEventMap = OrganizationEventMap & BranchEventMap;
