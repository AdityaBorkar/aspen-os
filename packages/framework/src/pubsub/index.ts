import PgBoss from "pg-boss";

import type { UnitDeps } from "../types";
import type { MessageHandler, PublishOptions, PubSubConfig } from "./types";

export type {
  Message,
  MessageHandler,
  PublishOptions,
  PubSubConfig,
} from "./types";

export class PubSubUnit {
  readonly name = "pubsub";

  private config: PubSubConfig;
  private boss: PgBoss | null = null;
  private subscriptions = new Map<string, PgBoss.WorkHandler<object>>();

  constructor(config: PubSubConfig) {
    this.config = config;
  }

  async initialize(_deps: UnitDeps): Promise<void> {
    this.boss = new PgBoss({
      database: this.config.database.database,
      host: this.config.database.host,
      monitorStateIntervalSeconds:
        this.config.monitorStateIntervalSeconds ?? 30,
      password: this.config.database.password,
      port: this.config.database.port,
      schema: this.config.database.ssl ? "pgboss" : undefined,
      user: this.config.database.user,
    });
    await this.boss.start();
  }

  async destroy(): Promise<void> {
    if (this.boss) {
      for (const topic of this.subscriptions.keys()) {
        await this.boss.offWork(topic);
      }
      this.subscriptions.clear();
      await this.boss.stop();
      this.boss = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.boss) return false;
    try {
      await this.boss.getQueueSize("___health___");
      return true;
    } catch {
      return false;
    }
  }

  async publish<T = unknown>(
    topic: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string> {
    if (!this.boss) throw new Error("PubSub not initialized");
    const id = await this.boss.send(topic, data as object, {
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

  async subscribe<T = unknown>(
    topic: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    if (!this.boss) throw new Error("PubSub not initialized");
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
    this.subscriptions.set(topic, workHandler);
    await this.boss.work(topic, workHandler);
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.boss) throw new Error("PubSub not initialized");
    await this.boss.offWork(topic);
    this.subscriptions.delete(topic);
  }

  async publishBatch<T = unknown>(
    topic: string,
    messages: { data: T; options?: PublishOptions }[],
  ): Promise<string[]> {
    if (!this.boss) throw new Error("PubSub not initialized");
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
    const result = await this.boss.insert(jobs);
    return result ?? [];
  }

  async getQueueSize(topic: string): Promise<number> {
    if (!this.boss) throw new Error("PubSub not initialized");
    return this.boss.getQueueSize(topic);
  }

  async purgeQueue(topic: string): Promise<void> {
    if (!this.boss) throw new Error("PubSub not initialized");
    await this.boss.deleteQueue(topic);
  }
}
