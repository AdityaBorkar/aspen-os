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

export interface Message<T = unknown> {
  completedOn?: Date;
  createdOn: Date;
  data: T;
  id: string;
  name: string;
}

export type MessageHandler<T = unknown> = (
  message: Message<T>,
) => void | Promise<void>;
