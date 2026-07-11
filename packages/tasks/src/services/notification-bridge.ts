import type { PubSubUnit } from "@aspen-os/framework/server";

import type {
  ReminderFiredEvent,
  TaskAssignedEvent,
  TaskCommentedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskLinkedEvent,
  TaskStatusChangedEvent,
  TaskUnassignedEvent,
  TaskUnlinkedEvent,
  TaskUpdatedEvent,
} from "../event-map";
import { REMINDER_EVENTS, TASK_EVENTS } from "../event-map";

export class NotificationBridge {
  constructor(private readonly pubsub: PubSubUnit) {}

  async publishTaskCreated(event: TaskCreatedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.CREATED, event);
  }

  async publishTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.UPDATED, event);
  }

  async publishTaskDeleted(event: TaskDeletedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.DELETED, event);
  }

  async publishTaskStatusChanged(event: TaskStatusChangedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.STATUS_CHANGED, event);
  }

  async publishTaskAssigned(event: TaskAssignedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.ASSIGNED, event);
  }

  async publishTaskUnassigned(event: TaskUnassignedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.UNASSIGNED, event);
  }

  async publishTaskLinked(event: TaskLinkedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.LINKED, event);
  }

  async publishTaskUnlinked(event: TaskUnlinkedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.UNLINKED, event);
  }

  async publishTaskCommented(event: TaskCommentedEvent): Promise<void> {
    await this.pubsub.publish(TASK_EVENTS.COMMENTED, event);
  }

  async publishReminderFired(event: ReminderFiredEvent): Promise<void> {
    await this.pubsub.publish(REMINDER_EVENTS.FIRED, event);
  }
}
