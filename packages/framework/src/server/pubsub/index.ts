import type { Auth } from "better-auth";
import PgBoss from "pg-boss";

import { context } from "../context";
import type { DatabaseUnit } from "../db";
import type { DatabaseConfig } from "../db/types";
import type { TenancyMode } from "../tenancy/types";
import type {
  MessageHandler,
  PublishOptions,
  PubSubConfig,
  ScheduleOptions,
} from "./types";

export type { PubSubConfig, ScheduleOptions } from "./types";

export class PubSubUnit {
  readonly $name = "pubsub" as const;

  private tenancyMode: TenancyMode;
  private dbUnit: DatabaseUnit;
  private authInstance: Auth | null = null;
  private monitorStateIntervalSeconds: number;

  private controlPlaneBoss: PgBoss;
  private tenantBosses: Map<string, PgBoss> = new Map();
  private subscriptions = new Map<string, PgBoss.WorkHandler<object>>();

  constructor(config: PubSubConfig, { db }: { db: DatabaseUnit }) {
    this.tenancyMode = db.tenancyMode;
    this.dbUnit = db;
    this.monitorStateIntervalSeconds = config.monitorStateIntervalSeconds ?? 30;
    this.controlPlaneBoss = this.createBoss(db.config);
  }

  setAuth(auth: Auth): void {
    this.authInstance = auth;
  }

  async $prepare(): Promise<void> {
    await this.controlPlaneBoss.start();
  }

  async $destroy(): Promise<void> {
    for (const topic of this.subscriptions.keys()) {
      try {
        await this.controlPlaneBoss.offWork(topic);
      } catch {
        // Topic may be on a per-tenant boss
      }
    }
    this.subscriptions.clear();
    await this.controlPlaneBoss.stop();
    for (const boss of this.tenantBosses.values()) {
      await boss.stop();
    }
    this.tenantBosses.clear();
  }

  async getQueueSize(topic: string): Promise<number> {
    const boss = await this.resolveBoss();
    return boss.getQueueSize(topic);
  }

  async publish<T = unknown>(
    topic: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string> {
    const boss = await this.resolveBoss();
    return this.sendToBoss(boss, topic, data, options);
  }

  async publishControlPlane<T = unknown>(
    topic: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string> {
    return this.sendToBoss(this.controlPlaneBoss, topic, data, options);
  }

  async publishBatch<T = unknown>(
    topic: string,
    messages: { data: T; options?: PublishOptions }[],
  ): Promise<string[]> {
    const boss = await this.resolveBoss();
    const jobs = messages.map((msg) => ({
      data: msg.data as object,
      name: topic,
      options: this.toBossOptions(msg.options),
    }));
    const result = await boss.insert(jobs);
    return result ?? [];
  }

  async purgeQueue(topic: string): Promise<void> {
    const boss = await this.resolveBoss();
    await boss.deleteQueue(topic);
  }

  async subscribe<T = unknown>(
    topic: string,
    handler: MessageHandler<T>,
  ): Promise<void> {
    const tenantId = context.getStore()?.tenantId;
    const wrappedHandler = await this.wrapHandler(handler, tenantId);
    this.subscriptions.set(topic, wrappedHandler);

    const boss = await this.resolveBoss(tenantId);
    await boss.work(topic, wrappedHandler);
  }

  async unsubscribe(topic: string): Promise<void> {
    const tenantId = context.getStore()?.tenantId;
    const boss = await this.resolveBoss(tenantId);
    await boss.offWork(topic);
    this.subscriptions.delete(topic);
  }

  async schedule(
    topic: string,
    cron: string,
    data?: unknown,
    options?: ScheduleOptions,
  ): Promise<void> {
    const boss = await this.resolveBoss();
    await boss.schedule(topic, cron, data as object | undefined, {
      ...this.toBossOptions(options),
      tz: options?.tz,
    });
  }

  async unschedule(topic: string): Promise<void> {
    const boss = await this.resolveBoss();
    await boss.unschedule(topic);
  }

  async getSchedules(): Promise<unknown[]> {
    return this.controlPlaneBoss.getSchedules();
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

  private async resolveBoss(tenantId?: string): Promise<PgBoss> {
    const id = tenantId ?? context.getStore()?.tenantId;
    if (this.tenancyMode === "isolated-db" && id) {
      return this.getTenantBoss(id);
    }
    return this.controlPlaneBoss;
  }

  private async getTenantBoss(tenantId: string): Promise<PgBoss> {
    let boss = this.tenantBosses.get(tenantId);
    if (!boss) {
      if (!this.dbUnit.tenantResolver) {
        throw new Error(
          "Tenant resolver is not available — tenancy mode is not isolated-db",
        );
      }
      const config = await this.dbUnit.tenantResolver.resolve(tenantId);
      boss = this.createBoss(config);
      await boss.start();
      this.tenantBosses.set(tenantId, boss);
    }
    return boss;
  }

  private async wrapHandler<T>(
    handler: MessageHandler<T>,
    tenantId: string | undefined,
  ): Promise<PgBoss.WorkHandler<object>> {
    const workHandler: PgBoss.WorkHandler<object> = async (jobs) => {
      for (const job of jobs) {
        const handlerDb =
          this.tenancyMode === "isolated-db" && tenantId
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

  private async sendToBoss<T>(
    boss: PgBoss,
    topic: string,
    data: T,
    options?: PublishOptions,
  ): Promise<string> {
    const id = await boss.send(
      topic,
      data as object,
      this.toBossOptions(options),
    );
    if (!id) throw new Error("Failed to publish message");
    return id;
  }
}
