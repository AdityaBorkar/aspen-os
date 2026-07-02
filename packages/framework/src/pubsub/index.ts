import PgBoss from "pg-boss";

import type { DatabaseConfig, Unit, UnitDeps } from "../types";

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

export function createPubSubUnit(config: PubSubConfig): PubSubUnit {
  let boss: PgBoss | null = null;
  const subscriptions = new Map<string, PgBoss.WorkHandler<object>>();

  async function initialize(_deps: UnitDeps): Promise<void> {
    boss = new PgBoss({
      database: config.database.database,
      host: config.database.host,
      monitorStateIntervalSeconds: config.monitorStateIntervalSeconds ?? 30,
      password: config.database.password,
      port: config.database.port,
      schema: config.database.ssl ? "pgboss" : undefined,
      user: config.database.user,
    });
    await boss.start();
  }

  async function destroy(): Promise<void> {
    if (boss) {
      for (const topic of subscriptions.keys()) {
        await boss.offWork(topic);
      }
      subscriptions.clear();
      await boss.stop();
      boss = null;
    }
  }

  async function healthCheck(): Promise<boolean> {
    if (!boss) return false;
    try {
      await boss.getQueueSize("___health___");
      return true;
    } catch {
      return false;
    }
  }

  async function publish<T = unknown>(
    topic: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string> {
    if (!boss) throw new Error("PubSub not initialized");
    const id = await boss.send(topic, data as object, {
      expireInMinutes: options?.expireInMinutes,
      priority: options?.priority,
      retryBackoff: options?.retryBackoff,
      retryDelay: options?.retryDelay,
      retryLimit: options?.retryLimit,
      startAfter: options?.startAfter,
    });
    if (!id) throw new Error("Failed to publish message");
    return id;
  }

  async function subscribe<T = unknown>(
    topic: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    if (!boss) throw new Error("PubSub not initialized");
    const workHandler: PgBoss.WorkHandler<object> = async (jobs) => {
      for (const job of jobs) {
        await handler({
          createdOn: new Date(),
          data: job.data as T,
          id: job.id,
          name: job.name,
        });
      }
    };
    subscriptions.set(topic, workHandler);
    await boss.work(topic, workHandler);
  }

  async function unsubscribe(topic: string): Promise<void> {
    if (!boss) throw new Error("PubSub not initialized");
    await boss.offWork(topic);
    subscriptions.delete(topic);
  }

  async function publishBatch<T = unknown>(
    topic: string,
    messages: { data: T; options?: PublishOptions }[],
  ): Promise<string[]> {
    if (!boss) throw new Error("PubSub not initialized");
    const jobs = messages.map((msg) => ({
      data: msg.data as object,
      name: topic,
      options: {
        expireInMinutes: msg.options?.expireInMinutes,
        priority: msg.options?.priority,
        retryBackoff: msg.options?.retryBackoff,
        retryDelay: msg.options?.retryDelay,
        retryLimit: msg.options?.retryLimit,
        startAfter: msg.options?.startAfter,
      },
    }));
    const result = await boss.insert(jobs);
    return result ?? [];
  }

  async function getQueueSize(topic: string): Promise<number> {
    if (!boss) throw new Error("PubSub not initialized");
    return boss.getQueueSize(topic);
  }

  async function purgeQueue(topic: string): Promise<void> {
    if (!boss) throw new Error("PubSub not initialized");
    await boss.deleteQueue(topic);
  }

  return {
    destroy,
    getQueueSize,
    healthCheck,
    initialize,
    name: "pubsub",
    publish,
    publishBatch,
    purgeQueue,
    subscribe,
    unsubscribe,
  };
}
