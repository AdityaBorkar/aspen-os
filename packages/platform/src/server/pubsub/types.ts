import type { JsonValue } from "#/server/types";

export interface PubSubConfig {
  monitorStateIntervalSeconds?: number;
  schema?: string;
}

/** JSON-serializable object payload for published messages. */
export type MessageData = Record<string, JsonValue>;

export interface PublishOptions {
  expireInMinutes?: number;
  priority?: number;
  retryBackoff?: boolean;
  retryDelay?: number;
  retryLimit?: number;
  startAfter?: Date | string;
}

export interface ScheduleOptions extends PublishOptions {
  tz?: string;
}

export interface Message<TValue = unknown> {
  completedOn?: Date;
  createdOn: Date;
  data: TValue;
  id: string;
  name: string;
}

export type MessageHandler<TValue = unknown> = (message: Message<TValue>) => void | Promise<void>;
