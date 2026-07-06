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
  PubSubUnit,
} from "./types";

export async function createPubSubUnit(
  config: PubSubConfig,
): Promise<PubSubUnitInterface> {
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

  const subscriptions = new Map<string, PgBoss.WorkHandler<object>>();

  return {
    async destroy() {
      for (const topic of subscriptions.keys()) {
        await boss.offWork(topic);
      }
      subscriptions.clear();
      await boss.stop();
    },

    async getQueueSize(topic: string) {
      return boss.getQueueSize(topic);
    },

    async healthCheck() {
      try {
        await boss.getQueueSize("___health___");
        return true;
      } catch {
        return false;
      }
    },
    name: "pubsub" as const,

    async publish<T = unknown>(
      topic: string,
      data: T,
      options?: PublishOptions,
    ) {
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
    },

    async publishBatch<T = unknown>(
      topic: string,
      messages: { data: T; options?: PublishOptions }[],
    ) {
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
    },

    async purgeQueue(topic: string) {
      await boss.deleteQueue(topic);
    },

    async subscribe<T = unknown>(topic: string, handler: MessageHandler<T>) {
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
    },

    async unsubscribe(topic: string) {
      await boss.offWork(topic);
      subscriptions.delete(topic);
    },
  };
}
