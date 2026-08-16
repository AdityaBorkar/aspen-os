import type { JsonValue } from "@aspen-os/platform/server";

export const TASK_EVENTS = {
  ASSIGNED: "task:assigned",
  COMMENTED: "task:commented",
  CREATED: "task:created",
  DELETED: "task:deleted",
  DUE_DATE_CHANGED: "task:due_date_changed",
  LINKED: "task:linked",
  STATUS_CHANGED: "task:status_changed",
  UNASSIGNED: "task:unassigned",
  UNLINKED: "task:unlinked",
  UPDATED: "task:updated",
} as const;

export const events = {
  TASK_EVENTS,
};

export interface TaskCreatedEvent {
  dueDate: string | null;
  task: { id: string; number: string | null; projectId: string; title: string };
}

export interface TaskUpdatedEvent {
  changes: Record<string, JsonValue>;
  task: { id: string; title: string };
}

export interface TaskDeletedEvent {
  taskId: string;
}

export interface TaskStatusChangedEvent {
  fromStatus: string;
  task: { id: string; title: string };
  toStatus: string;
}

export interface TaskAssignedEvent {
  assignedBy: string;
  taskId: string;
  userId: string;
}

export interface TaskUnassignedEvent {
  taskId: string;
  userId: string;
}

export interface TaskLinkedEvent {
  linkType: string;
  sourceId: string;
  targetId: string;
}

export interface TaskUnlinkedEvent {
  sourceId: string;
  targetId: string;
}

export interface TaskCommentedEvent {
  comment: { body: string; id: string };
  taskId: string;
}

export interface TaskTimeLoggedEvent {
  taskId: string;
  timeEntry: { duration: number; id: string; userId: string };
}

export interface TaskDueDateChangedEvent {
  dueDate: string | null;
  taskId: string;
  userIds: string[];
}

export interface TaskEventMap {
  [TASK_EVENTS.ASSIGNED]: TaskAssignedEvent;
  [TASK_EVENTS.COMMENTED]: TaskCommentedEvent;
  [TASK_EVENTS.CREATED]: TaskCreatedEvent;
  [TASK_EVENTS.DELETED]: TaskDeletedEvent;
  [TASK_EVENTS.DUE_DATE_CHANGED]: TaskDueDateChangedEvent;
  [TASK_EVENTS.LINKED]: TaskLinkedEvent;
  [TASK_EVENTS.STATUS_CHANGED]: TaskStatusChangedEvent;
  [TASK_EVENTS.UNASSIGNED]: TaskUnassignedEvent;
  [TASK_EVENTS.UNLINKED]: TaskUnlinkedEvent;
  [TASK_EVENTS.UPDATED]: TaskUpdatedEvent;
}

export type TaskDomainEventMap = TaskEventMap;
