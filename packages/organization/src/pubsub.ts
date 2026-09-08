import type { JsonValue } from "@aspen-os/platform/server";

export const BRANCH_EVENTS = {
  CREATED: "branch:created",
  UPDATED: "branch:updated",
} as const;

export const events = {
  BRANCH_EVENTS,
};

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

export interface BranchEventMap {
  [BRANCH_EVENTS.CREATED]: BranchCreatedEvent;
  [BRANCH_EVENTS.UPDATED]: BranchUpdatedEvent;
}

export type OrganizationDomainEventMap = BranchEventMap;
