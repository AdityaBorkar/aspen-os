import PgBoss from "pg-boss";

import type {
  MessageHandler,
  PublishOptions,
  PubSubConfig,
  PubSubUnit as PubSubUnitInterface,
} from "./types";

export type {
  Message,
  MessageHandler,
  PublishOptions,
  PubSubConfig,
} from "./types";

export class PubSubUnit implements PubSubUnitInterface {
  readonly name = "pubsub" as const;

  private boss: PgBoss;
  private subscriptions = new Map<string, PgBoss.WorkHandler<object>>();

  private constructor(boss: PgBoss) {
    this.boss = boss;
  }

  static async create(config: PubSubConfig): Promise<PubSubUnit> {
    const boss = new PgBoss({
      database: config.database.database,
      host: config.database.host,
      monitorStateIntervalSeconds: config.monitorStateIntervalSeconds ?? 30,
      password: config.database.password,
      port: config.database.port,
      schema: config.database.ssl ? "pgboss" : undefined,
      user: config.database.user,
    });
    await boss.start();
    return new PubSubUnit(boss);
  }

  async destroy(): Promise<void> {
    for (const topic of this.subscriptions.keys()) {
      await this.boss.offWork(topic);
    }
    this.subscriptions.clear();
    await this.boss.stop();
  }

  async getQueueSize(topic: string): Promise<number> {
    return this.boss.getQueueSize(topic);
  }

  async healthCheck(): Promise<boolean> {
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
}
