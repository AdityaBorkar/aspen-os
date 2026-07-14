import PgBoss from "pg-boss";

import type { DatabaseUnit } from "../db";
import type {
  MessageHandler,
  PublishOptions,
  PubSubConfig,
  ScheduleOptions,
} from "./types";

export type { PubSubConfig, ScheduleOptions } from "./types";

export class PubSubUnit {
  readonly $name = "pubsub" as const;

  private boss: PgBoss;
  private subscriptions = new Map<string, PgBoss.WorkHandler<object>>();

  constructor(config: PubSubConfig, { db }: { db: DatabaseUnit }) {
    const { database, host, password, port, user, ssl } = db.config;
    const monitorStateIntervalSeconds =
      config.monitorStateIntervalSeconds ?? 30;
    this.boss = new PgBoss({
      database,
      host,
      monitorStateIntervalSeconds,
      password,
      port,
      schema: ssl ? "pgboss" : undefined,
      user,
    });
  }

  async $prepare(): Promise<void> {
    await this.boss.start();
  }

  async $destroy(): Promise<void> {
    for (const topic of this.subscriptions.keys()) {
      await this.boss.offWork(topic);
    }
    this.subscriptions.clear();
    await this.boss.stop();
  }

  async getQueueSize(topic: string): Promise<number> {
    return this.boss.getQueueSize(topic);
  }

  async publish<T = unknown>(
    topic: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string> {
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

  async publishBatch<T = unknown>(
    topic: string,
    messages: { data: T; options?: PublishOptions }[],
  ): Promise<string[]> {
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

  async purgeQueue(topic: string): Promise<void> {
    await this.boss.deleteQueue(topic);
  }

  async subscribe<T = unknown>(
    topic: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
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
    await this.boss.offWork(topic);
    this.subscriptions.delete(topic);
  }

  async schedule(
    topic: string,
    cron: string,
    data?: unknown,
    options?: ScheduleOptions,
  ): Promise<void> {
    await this.boss.schedule(topic, cron, data as object | undefined, {
      expireInMinutes: options?.expireInMinutes,
      priority: options?.priority,
      retryBackoff: options?.retryBackoff,
      retryDelay: options?.retryDelay,
      retryLimit: options?.retryLimit,
      startAfter: options?.startAfter,
      tz: options?.tz,
    });
  }

  async unschedule(topic: string): Promise<void> {
    await this.boss.unschedule(topic);
  }

  async getSchedules(): Promise<unknown[]> {
    return this.boss.getSchedules();
  }
}
