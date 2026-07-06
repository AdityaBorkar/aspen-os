import type { DatabaseConfig, Unit } from "../types";

export interface PubSubConfig {
  database: DatabaseConfig;
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

export interface PubSubUnit extends Unit {
  getQueueSize(topic: string): Promise<number>;
  publish<T = unknown>(
    topic: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string>;
  publishBatch<T = unknown>(
    topic: string,
    messages: { data: T; options?: PublishOptions }[],
  ): Promise<string[]>;
  purgeQueue(topic: string): Promise<void>;
  subscribe<T = unknown>(
    topic: string,
    handler: MessageHandler<T>,
  ): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
}
