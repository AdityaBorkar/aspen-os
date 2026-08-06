import PgBoss from "pg-boss";

import type { AuthUnit } from "../auth";
import type { DatabaseUnit } from "../db";
import type { DatabaseConfig } from "../db/types";
import type { TenancyMode } from "../index";
import { context } from "../utils/context";
import { isGlobalTenantId } from "../utils/is-global-tenant-id";
import type {
  MessageHandler,
  PublishOptions,
  PubSubConfig,
  ScheduleOptions,
} from "./types";

export type { PubSubConfig, ScheduleOptions } from "./types";

export class PubSubUnit {
  readonly $name = "pubsub" as const;

  // biome-ignore lint/suspicious/noExplicitAny: drizzle NodePgDatabase invariance forces any here
  private dbUnit: DatabaseUnit<any>;
  private tenancyMode: TenancyMode;
  private authInstance: AuthUnit | null = null;
  private monitorStateIntervalSeconds: number;

  private readonly boss: PgBoss;
  private subscriptions = new Map<string, PgBoss.WorkHandler<object>>();
  private bossStarted: Promise<void> | null = null;

  constructor(
    config: PubSubConfig,
    // biome-ignore lint/suspicious/noExplicitAny: drizzle NodePgDatabase invariance forces any here
    { db }: { db: DatabaseUnit<any> },
  ) {
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
    for (const topic of this.subscriptions.keys()) {
      try {
        await this.boss.offWork(topic);
      } catch {
        // Ignore — topic may not be registered on the control-plane boss
      }
    }
    this.subscriptions.clear();
    await this.boss.stop();
  }

  async getQueueSize(topic: string): Promise<number> {
    await this.ensureStarted();
    return this.boss.getQueueSize(topic);
  }

  async publish<T extends object>(
    topic: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string> {
    await this.ensureStarted();
    try {
      const opts = this.toBossOptions(options);
      const id = await this.boss.send(topic, data, opts);
      if (!id) {
        throw new Error("Failed to publish message");
      }
      return id;
    } catch (err) {
      const msg = `Failed to publish message to topic "${topic}"`;
      console.error(msg, err);
      throw new Error(
        `${msg}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async publishBatch<T = unknown>(
    topic: string,
    messages: { data: T; options?: PublishOptions }[],
  ): Promise<string[]> {
    await this.ensureStarted();
    const jobs = messages.map((msg) => ({
      data: msg.data as object,
      name: topic,
      options: this.toBossOptions(msg.options),
    }));
    try {
      const result = await this.boss.insert(jobs);
      return result ?? [];
    } catch (err) {
      const msg = `Failed to publish batch of ${messages.length} message(s) to topic "${topic}"`;
      console.error(msg, err);
      throw new Error(
        `${msg}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async purgeQueue(topic: string): Promise<void> {
    await this.ensureStarted();
    await this.boss.deleteQueue(topic);
  }

  async subscribe<T = unknown>(
    topic: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
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

  async schedule(
    topic: string,
    cron: string,
    data?: unknown,
    options?: ScheduleOptions,
  ): Promise<void> {
    await this.ensureStarted();
    await this.boss.schedule(topic, cron, data as object | undefined, {
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
    } catch (err) {
      this.bossStarted = null;
      throw err;
    }
  }

  private async wrapHandler<T>(
    handler: MessageHandler<T>,
    tenantId: string | undefined,
  ): Promise<PgBoss.WorkHandler<object>> {
    const workHandler: PgBoss.WorkHandler<object> = async (jobs) => {
      for (const job of jobs) {
        const handlerDb =
          this.tenancyMode === "isolated" &&
          tenantId &&
          !isGlobalTenantId(tenantId)
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
              data: job.data as T,
              id: job.id,
              name: job.name,
            });
          },
        );
      }
    };
    return workHandler;
  }

  private toBossOptions(options?: PublishOptions): Record<string, unknown> {
    if (!options) return {};
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
