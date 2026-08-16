import { TASK_EVENTS } from "#/pubsub";
import type {
  TaskAssignedEvent,
  TaskCommentedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskDueDateChangedEvent,
  TaskLinkedEvent,
  TaskStatusChangedEvent,
  TaskUnassignedEvent,
  TaskUnlinkedEvent,
  TaskUpdatedEvent,
} from "#/pubsub";

import type { PubSubUnit } from "@aspen-os/platform/server";

export interface NotificationBridgeDeps {
  pubsub: PubSubUnit;
}

export async function publishTaskCreated(
  event: TaskCreatedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.CREATED, { ...event });
}

export async function publishTaskUpdated(
  event: TaskUpdatedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.UPDATED, { ...event });
}

export async function publishTaskDeleted(
  event: TaskDeletedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.DELETED, { ...event });
}

export async function publishTaskStatusChanged(
  event: TaskStatusChangedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.STATUS_CHANGED, { ...event });
}

export async function publishTaskAssigned(
  event: TaskAssignedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.ASSIGNED, { ...event });
}

export async function publishTaskUnassigned(
  event: TaskUnassignedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.UNASSIGNED, { ...event });
}

export async function publishTaskLinked(
  event: TaskLinkedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.LINKED, { ...event });
}

export async function publishTaskUnlinked(
  event: TaskUnlinkedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.UNLINKED, { ...event });
}

export async function publishTaskCommented(
  event: TaskCommentedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.COMMENTED, { ...event });
}

export async function publishTaskDueDateChanged(
  event: TaskDueDateChangedEvent,
  { pubsub }: NotificationBridgeDeps,
): Promise<void> {
  await pubsub.publish(TASK_EVENTS.DUE_DATE_CHANGED, { ...event });
}
