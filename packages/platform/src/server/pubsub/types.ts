export interface PubSubConfig {
  monitorStateIntervalSeconds?: number;
  schema?: string;
}

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
