import type { AuthUnit } from "#/server/auth";
import type { DatabaseUnit } from "#/server/db";
import type { DatabaseConfig } from "#/server/db/types";
import type { TenancyMode } from "#/server/types";
import { context, isGlobalTenantId } from "#/server/utils";

import PgBoss from "pg-boss";

import type {
  MessageData,
  MessageHandler,
  PublishOptions,
  PubSubConfig,
  ScheduleOptions,
} from "./types";

export class PubSubUnit {
  readonly $name = "pubsub" as const;

  private readonly dbUnit: DatabaseUnit<any>;
  private readonly tenancyMode: TenancyMode;
  private authInstance: AuthUnit | null = null;
  private readonly monitorStateIntervalSeconds: number;

  private readonly boss: PgBoss;
  private readonly subscriptions = new Map<string, PgBoss.WorkHandler<object>>();
  private readonly producedTopics = new Map<string, number>();
  private bossStarted: Promise<void> | null = null;

  constructor(config: PubSubConfig, { db }: { db: DatabaseUnit<any> }) {
    this.dbUnit = db;
    this.tenancyMode = db.tenancyMode;
    this.monitorStateIntervalSeconds = config.monitorStateIntervalSeconds ?? 30;
    this.boss = this.createBoss(db.config);
  }

  setAuth(auth: AuthUnit): void {
    this.authInstance = auth;
  }

  async $prepareInfra(): Promise<void> {
    // No-op: the single control-plane pg-boss is started lazily on first use.
    // $prepareInfra runs at deploy time, before the server starts.
  }

  async $cleanup(): Promise<void> {
    await Promise.all(
      [...this.subscriptions.keys()].map(async (topic) => {
        try {
          await this.boss.offWork(topic);
        } catch {
          // Ignore — topic may not be registered on the control-plane boss
        }
      }),
    );
    this.subscriptions.clear();
    await this.boss.stop();
  }

  async getQueueSize(topic: string): Promise<number> {
    await this.ensureStarted();
    return this.boss.getQueueSize(topic);
  }

  async publish(topic: string, data: MessageData, options?: PublishOptions) {
    await this.ensureStarted();
    try {
      const opts = this.toBossOptions(options);
      const id = await this.boss.send(topic, data, opts);
      this.recordProduced(topic);
      if (!id) {
        console.warn(
          `Failed to publish message to topic "${topic}": pg-boss send() returned no job id, so the message was NOT inserted.`,
        );
      }
      return id;
    } catch (error) {
      const msg = `Failed to publish message to topic "${topic}"`;
      console.error(msg, error);
      throw new Error(`${msg}: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      });
    }
  }

  async publishBatch(
    topic: string,
    messages: { data: MessageData; options?: PublishOptions }[],
  ): Promise<string[]> {
    await this.ensureStarted();
    const jobs = messages.map((msg) => ({
      data: msg.data,
      name: topic,
      options: this.toBossOptions(msg.options),
    }));
    try {
      const result = await this.boss.insert(jobs);
      for (const job of jobs) {
        this.recordProduced(job.name);
      }
      return result ?? [];
    } catch (error) {
      const msg = `Failed to publish batch of ${messages.length} message(s) to topic "${topic}"`;
      console.error(msg, error);
      throw new Error(`${msg}: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      });
    }
  }

  async purgeQueue(topic: string): Promise<void> {
    await this.ensureStarted();
    await this.boss.deleteQueue(topic);
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<void> {
    const tenantId = context.getStore()?.tenantId;
    const wrappedHandler = await this.wrapHandler(handler, tenantId);
    this.subscriptions.set(topic, wrappedHandler);

    await this.ensureStarted();
    await this.boss.work(topic, wrappedHandler);
  }

  async unsubscribe(topic: string): Promise<void> {
    await this.ensureStarted();
    await this.boss.offWork(topic);
    this.subscriptions.delete(topic);
  }

  async schedule(input: {
    topic: string;
    cron: string;
    data?: MessageData;
    options?: ScheduleOptions;
  }): Promise<void> {
    const { topic, cron, data, options } = input;
    await this.ensureStarted();
    await this.boss.schedule(topic, cron, data, {
      ...this.toBossOptions(options),
      tz: options?.tz,
    });
  }

  async unschedule(topic: string): Promise<void> {
    await this.ensureStarted();
    await this.boss.unschedule(topic);
  }

  async getSchedules(): Promise<unknown[]> {
    return this.boss.getSchedules();
  }

  // -------------------------------------------------

  private createBoss(dbConfig: DatabaseConfig): PgBoss {
    return new PgBoss({
      database: dbConfig.database,
      host: dbConfig.host,
      monitorStateIntervalSeconds: this.monitorStateIntervalSeconds,
      password: dbConfig.password,
      port: dbConfig.port,
      schema: dbConfig.ssl ? "pgboss" : undefined,
      user: dbConfig.user,
    });
  }

  private async ensureStarted(): Promise<void> {
    if (!this.bossStarted) {
      this.bossStarted = this.startBoss();
    }
    await this.bossStarted;
  }

  private async startBoss(): Promise<void> {
    try {
      await this.boss.start();
    } catch (error) {
      this.bossStarted = null;
      throw error;
    }
  }

  private async wrapHandler(
    handler: MessageHandler,
    tenantId: string | undefined,
  ): Promise<PgBoss.WorkHandler<object>> {
    const workHandler: PgBoss.WorkHandler<object> = async (jobs) => {
      // oxlint-disable eslint/no-await-in-loop
      for (const job of jobs) {
        const handlerDb =
          this.tenancyMode === "isolated" && tenantId && !isGlobalTenantId(tenantId)
            ? await this.dbUnit.getTenantDb(tenantId)
            : this.dbUnit.controlPlaneDb;

        await context.run(
          {
            auth: this.authInstance ?? undefined,
            db: handlerDb,
            pubsub: this,
            tenantId,
          },
          async () => {
            await handler({
              createdOn: new Date(),
              data: job.data,
              id: job.id,
              name: job.name,
            });
          },
        );
      }
      // oxlint-enable eslint/no-await-in-loop
    };
    return workHandler;
  }

  /**
   * Track that a message was published to `topic`. Used by the health check to
   * detect topics that were produced to but have no registered consumer (which
   * pg-boss silently drops).
   */
  private recordProduced(topic: string): void {
    this.producedTopics.set(topic, (this.producedTopics.get(topic) ?? 0) + 1);
  }

  /**
   * Topics that have been produced to but currently have no registered
   * subscriber. Publishing to such a topic is silently dropped by pg-boss
   * (send() returns null), so this flags a likely bug.
   */
  getUnsubscribedProducedTopics(): string[] {
    return [...this.producedTopics.keys()].filter((topic) => !this.subscriptions.has(topic));
  }

  private toBossOptions(options?: PublishOptions): PublishOptions {
    if (!options) {
      return {};
    }
    return {
      expireInMinutes: options.expireInMinutes,
      priority: options.priority,
      retryBackoff: options.retryBackoff,
      retryDelay: options.retryDelay,
      retryLimit: options.retryLimit,
      startAfter: options.startAfter,
    };
  }
}
